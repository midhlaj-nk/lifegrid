"use server";

import { db } from "@/db";
import { vaultItems, vaultMeta } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// The server only ever moves ciphertext blobs. All encryption/decryption
// happens in the browser (src/lib/vault-crypto.ts). NEVER add an action
// here that accepts or returns vault plaintext.

export async function setupVault(salt: string, keyCheck: string) {
  const user = await requireUser();
  const [existing] = await db
    .select()
    .from(vaultMeta)
    .where(eq(vaultMeta.userId, user.id));
  if (existing) return { error: "Vault already initialized" };
  await db.insert(vaultMeta).values({ userId: user.id, salt, keyCheck });
  revalidatePath("/vault");
  return { ok: true };
}

export async function getVaultMeta() {
  const user = await requireUser();
  const [meta] = await db
    .select()
    .from(vaultMeta)
    .where(eq(vaultMeta.userId, user.id));
  return meta ?? null;
}

export async function listVaultItems() {
  const user = await requireUser();
  return db
    .select()
    .from(vaultItems)
    .where(eq(vaultItems.userId, user.id))
    .orderBy(asc(vaultItems.createdAt));
}

export async function createVaultItem(
  type: "login" | "apikey" | "note" | "pem",
  data: string
) {
  const user = await requireUser();
  const id = randomUUID();
  await db.insert(vaultItems).values({ id, userId: user.id, type, data });
  revalidatePath("/vault");
  return id;
}

export async function updateVaultItem(id: string, data: string) {
  const user = await requireUser();
  await db
    .update(vaultItems)
    .set({ data, updatedAt: new Date() })
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, user.id)));
  revalidatePath("/vault");
}

/**
 * Master-password change: client re-encrypts every item with the new key and
 * sends all ciphertext in one shot. Still ciphertext-only on the wire.
 */
export async function replaceVaultKey(
  salt: string,
  keyCheck: string,
  items: { id: string; data: string }[]
) {
  const user = await requireUser();
  const existing = await db
    .select({ id: vaultItems.id })
    .from(vaultItems)
    .where(eq(vaultItems.userId, user.id));
  const validIds = new Set(existing.map((i) => i.id));
  if (items.some((i) => !validIds.has(i.id)) || items.length !== validIds.size) {
    return { error: "Item set mismatch — reload and retry" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(vaultMeta)
      .set({ salt, keyCheck })
      .where(eq(vaultMeta.userId, user.id));
    for (const item of items) {
      await tx
        .update(vaultItems)
        .set({ data: item.data, updatedAt: new Date() })
        .where(and(eq(vaultItems.id, item.id), eq(vaultItems.userId, user.id)));
    }
  });
  revalidatePath("/vault");
  return { ok: true };
}

export async function deleteVaultItem(id: string) {
  const user = await requireUser();
  await db
    .delete(vaultItems)
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, user.id)));
  revalidatePath("/vault");
}

/**
 * Wipe the entire vault (meta + all items) for the authenticated user.
 * Irreversible — only call after explicit user confirmation in the UI.
 * Allows setup of a fresh vault after the master password is lost.
 */
export async function nukeVault() {
  const user = await requireUser();
  await db.transaction(async (tx) => {
    await tx.delete(vaultItems).where(eq(vaultItems.userId, user.id));
    await tx.delete(vaultMeta).where(eq(vaultMeta.userId, user.id));
  });
  revalidatePath("/vault");
  return { ok: true };
}
