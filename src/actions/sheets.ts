"use server";

import { db } from "@/db";
import { sheets } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createSheet(name?: string) {
  const user = await requireUser();
  const id = randomUUID();
  await db.insert(sheets).values({
    id,
    userId: user.id,
    name: name?.trim().slice(0, 120) || "Untitled sheet",
  });
  revalidatePath("/sheets");
  return id;
}

export async function renameSheet(id: string, name: string) {
  const user = await requireUser();
  await db
    .update(sheets)
    .set({ name: name.trim().slice(0, 120) || "Untitled sheet", updatedAt: new Date() })
    .where(and(eq(sheets.id, id), eq(sheets.userId, user.id)));
  revalidatePath("/sheets");
}

export async function saveSheetData(id: string, data: string) {
  const user = await requireUser();
  if (data.length > 8_000_000) return { error: "Sheet too large" };
  await db
    .update(sheets)
    .set({ data, updatedAt: new Date() })
    .where(and(eq(sheets.id, id), eq(sheets.userId, user.id)));
  return { ok: true };
}

export async function deleteSheet(id: string) {
  const user = await requireUser();
  await db
    .delete(sheets)
    .where(and(eq(sheets.id, id), eq(sheets.userId, user.id)));
  revalidatePath("/sheets");
}
