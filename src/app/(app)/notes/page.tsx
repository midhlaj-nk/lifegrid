import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { NotesTree } from "@/components/notes/notes-tree";

export default async function NotesPage() {
  const user = await requireUser();
  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      icon: notes.icon,
      parentId: notes.parentId,
    })
    .from(notes)
    .where(eq(notes.userId, user.id))
    .orderBy(asc(notes.sortOrder), asc(notes.createdAt));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Notes</h1>
        <p className="text-sm text-muted-foreground">
          Nested pages, Notion-style
        </p>
      </header>
      <NotesTree notes={rows} />
    </div>
  );
}
