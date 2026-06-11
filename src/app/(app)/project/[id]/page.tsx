import { notFound } from "next/navigation";
import Link from "next/link";
import { Columns3 } from "lucide-react";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getProjectTasks } from "@/lib/queries";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList, Section } from "@/components/tasks/task-list";
import { ProjectCover } from "@/components/cover-clients";

export default async function ProjectPage({
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

  const tasks = await getProjectTasks(user.id, id);
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      <ProjectCover projectId={id} cover={project.cover} />
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
        </div>
        <Link
          href={`/project/${id}/board`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          <Columns3 className="h-3.5 w-3.5" /> Board
        </Link>
      </header>

      <QuickAdd projectId={id} />

      <Section title="Tasks" count={open.length}>
        <TaskList tasks={open} emptyText="No open tasks in this project." />
      </Section>

      {done.length > 0 && (
        <Section title="Completed" count={done.length}>
          <TaskList tasks={done} />
        </Section>
      )}
    </div>
  );
}
