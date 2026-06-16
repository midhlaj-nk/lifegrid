import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { NotesLanding } from "@/components/notes/notes-landing";

export default async function NotesPage() {
  const user = await requireUser();
  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      icon: notes.icon,
      cover: notes.cover,
      parentId: notes.parentId,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(eq(notes.userId, user.id))
    .orderBy(desc(notes.updatedAt))
    .limit(200);

  return (
    <NotesLanding
      notes={rows.map((n) => ({ ...n, updatedAt: n.updatedAt.toISOString() }))}
    />
  );
}
