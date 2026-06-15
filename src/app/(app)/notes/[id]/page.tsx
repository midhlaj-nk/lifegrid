import { notFound } from "next/navigation";
import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { db } from "@/db";
import { notes, noteTaskLinks, tasks } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { NoteEditorShell } from "@/components/notes/note-editor-shell";
import { NotionPageHeader, LinkedTasks, MoveNoteButton, ModeToggle } from "./note-client";
import { NoteCanvas } from "@/components/notes/note-canvas";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)));
  if (!note) notFound();

  const [children, links, openTasks, allNotes] = await Promise.all([
    db
      .select({ id: notes.id, title: notes.title, icon: notes.icon })
      .from(notes)
      .where(and(eq(notes.userId, user.id), eq(notes.parentId, id)))
      .orderBy(asc(notes.createdAt)),
    db
      .select({ taskId: noteTaskLinks.taskId })
      .from(noteTaskLinks)
      .where(eq(noteTaskLinks.noteId, id)),
    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status })
      .from(tasks)
      .where(and(eq(tasks.userId, user.id)))
      .orderBy(asc(tasks.createdAt)),
    db
      .select({
        id: notes.id,
        title: notes.title,
        icon: notes.icon,
        parentId: notes.parentId,
      })
      .from(notes)
      .where(eq(notes.userId, user.id)),
  ]);

  const linkedIds = links.map((l) => l.taskId);
  const linkedTasks = linkedIds.length
    ? openTasks.filter((t) => linkedIds.includes(t.id))
    : [];

  // breadcrumbs
  const crumbs: { id: string; title: string }[] = [];
  let cursor = note.parentId;
  while (cursor) {
    const [p] = await db
      .select({ id: notes.id, title: notes.title, parentId: notes.parentId })
      .from(notes)
      .where(and(eq(notes.id, cursor), eq(notes.userId, user.id)));
    if (!p) break;
    crumbs.unshift({ id: p.id, title: p.title });
    cursor = p.parentId;
  }

  return (
    <div>
      {/* Notion-style cover + icon + title — cover bleeds full-width, content self-constrains */}
      <NotionPageHeader
        noteId={note.id}
        initialTitle={note.title}
        initialIcon={note.icon}
        initialCover={note.cover}
      />

      <div className="mx-auto max-w-3xl space-y-4 px-3 md:px-8">
      {/* Breadcrumb nav */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/notes" className="hover:text-foreground">
          Notes
        </Link>
        {crumbs.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <Link href={`/notes/${c.id}`} className="hover:text-foreground">
              {c.title}
            </Link>
          </span>
        ))}
        <span className="ml-auto flex items-center gap-3">
          <ModeToggle noteId={note.id} mode={note.mode} />
          <MoveNoteButton noteId={note.id} allNotes={allNotes} />
        </span>
      </nav>

      <LinkedTasks
        noteId={note.id}
        linked={linkedTasks}
        allTasks={openTasks.filter((t) => t.status !== "done")}
      />

      {note.mode === "canvas" ? (
        <NoteCanvas
          noteId={note.id}
          title={note.title}
          initialCanvas={note.canvas}
        />
      ) : (
        <NoteEditorShell
          noteId={note.id}
          initialContent={note.content}
          tasks={openTasks
            .filter((t) => t.status !== "done")
            .map((t) => ({ id: t.id, title: t.title }))}
          notes={allNotes
            .filter((n) => n.id !== note.id)
            .map((n) => ({ id: n.id, title: n.title, icon: n.icon }))}
        />
      )}

      {children.length > 0 && (
        <section className="border-t border-border pt-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Subpages
          </h2>
          <div className="space-y-1">
            {children.map((c) => (
              <Link
                key={c.id}
                href={`/notes/${c.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span>{c.icon}</span>
                {c.title}
              </Link>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
