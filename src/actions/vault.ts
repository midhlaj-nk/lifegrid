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

export async function deleteVaultItem(id: string) {
  const user = await requireUser();
  await db
    .delete(vaultItems)
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, user.id)));
  revalidatePath("/vault");
}
