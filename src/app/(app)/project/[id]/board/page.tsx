import { notFound } from "next/navigation";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { List } from "lucide-react";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { KanbanBoard } from "./board-client";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)));
  if (!project) notFound();

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .where(and(eq(tasks.userId, user.id), eq(tasks.projectId, id)))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-xl font-semibold tracking-tight">
            {project.name} — Board
          </h1>
        </div>
        <Link
          href={`/project/${id}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          <List className="h-3.5 w-3.5" /> List view
        </Link>
      </header>
      <KanbanBoard projectId={id} tasks={rows.filter((t) => !("parentId" in t))} />
    </div>
  );
}
