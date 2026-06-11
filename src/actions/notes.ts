"use server";

import { db } from "@/db";
import { notes, noteTaskLinks } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createNote(input: {
  parentId?: string | null;
  title?: string;
}) {
  const user = await requireUser();
  const id = randomUUID();
  await db.insert(notes).values({
    id,
    userId: user.id,
    parentId: input.parentId ?? null,
    title: input.title?.trim() || "Untitled",
  });
  revalidatePath("/notes", "layout");
  return id;
}

export async function updateNote(
  id: string,
  input: { title?: string; icon?: string; content?: string; parentId?: string | null }
) {
  const user = await requireUser();
  await db
    .update(notes)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)));
  // content saves happen on a debounce — skip revalidate for those
  if (input.title !== undefined || input.icon !== undefined || input.parentId !== undefined) {
    revalidatePath("/notes", "layout");
  }
}

export async function deleteNote(id: string) {
  const user = await requireUser();
  // collect descendants (BFS) so nested pages don't orphan
  const all = await db
    .select({ id: notes.id, parentId: notes.parentId })
    .from(notes)
    .where(eq(notes.userId, user.id));
  const toDelete = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of all) {
      if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
        toDelete.add(n.id);
        grew = true;
      }
    }
  }
  await db
    .delete(notes)
    .where(and(eq(notes.userId, user.id), inArray(notes.id, [...toDelete])));
  revalidatePath("/notes", "layout");
}

export async function linkNoteToTask(noteId: string, taskId: string) {
  await requireUser();
  await db
    .insert(noteTaskLinks)
    .values({ noteId, taskId })
    .onConflictDoNothing();
  revalidatePath(`/notes/${noteId}`);
}

export async function unlinkNoteFromTask(noteId: string, taskId: string) {
  await requireUser();
  await db
    .delete(noteTaskLinks)
    .where(
      and(eq(noteTaskLinks.noteId, noteId), eq(noteTaskLinks.taskId, taskId))
    );
  revalidatePath(`/notes/${noteId}`);
}
