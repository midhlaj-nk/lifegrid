"use server";

import { db } from "@/db";
import { notes, sheets, tasks } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getTaskById } from "@/lib/queries";
import { and, desc, eq, like, or } from "drizzle-orm";

export type SearchResult = {
  id: string;
  type: "task" | "note" | "sheet";
  title: string;
  url: string;
  icon?: string;
};

export async function fetchTaskForPane(id: string) {
  const user = await requireUser();
  return getTaskById(user.id, id);
}

/** Recent items shown when palette opens with no query. */
export async function getRecentItems(): Promise<SearchResult[]> {
  const user = await requireUser();
  const [recentNotes, recentSheets] = await Promise.all([
    db
      .select({ id: notes.id, title: notes.title, icon: notes.icon })
      .from(notes)
      .where(eq(notes.userId, user.id))
      .orderBy(desc(notes.updatedAt))
      .limit(4),
    db
      .select({ id: sheets.id, title: sheets.name })
      .from(sheets)
      .where(eq(sheets.userId, user.id))
      .orderBy(desc(sheets.updatedAt))
      .limit(2),
  ]);
  return [
    ...recentNotes.map((r) => ({
      id: r.id,
      type: "note" as const,
      title: r.title,
      url: `/notes/${r.id}`,
      icon: r.icon,
    })),
    ...recentSheets.map((r) => ({
      id: r.id,
      type: "sheet" as const,
      title: r.title,
      url: `/sheets/${r.id}`,
    })),
  ];
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const user = await requireUser();
  if (!query.trim()) return [];

  const q = `%${query.trim()}%`;

  const [taskRows, noteRows, sheetRows] = await Promise.all([
    db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, user.id),
          or(like(tasks.title, q), like(tasks.note, q))
        )
      )
      .limit(5),
    db
      .select({ id: notes.id, title: notes.title, icon: notes.icon })
      .from(notes)
      .where(
        and(
          eq(notes.userId, user.id),
          or(like(notes.title, q), like(notes.content, q))
        )
      )
      .limit(8),
    db
      .select({ id: sheets.id, title: sheets.name })
      .from(sheets)
      .where(and(eq(sheets.userId, user.id), like(sheets.name, q)))
      .limit(5),
  ]);

  return [
    ...taskRows.map((r) => ({
      id: r.id,
      type: "task" as const,
      title: r.title,
      url: `/tasks`,
    })),
    ...noteRows.map((r) => ({
      id: r.id,
      type: "note" as const,
      title: r.title,
      url: `/notes/${r.id}`,
      icon: r.icon,
    })),
    ...sheetRows.map((r) => ({
      id: r.id,
      type: "sheet" as const,
      title: r.title,
      url: `/sheets/${r.id}`,
    })),
  ];
}
