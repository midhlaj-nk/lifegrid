import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { areas, projects } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getAreaTasks } from "@/lib/queries";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList, Section } from "@/components/tasks/task-list";
import { AreaCover } from "@/components/cover-clients";

export default async function AreaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [area] = await db
    .select()
    .from(areas)
    .where(and(eq(areas.id, id), eq(areas.userId, user.id)));
  if (!area) notFound();

  const areaProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, user.id), eq(projects.areaId, id)));

  const tasks = await getAreaTasks(user.id, id);
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      <AreaCover areaId={id} cover={area.cover} />
      <header className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: area.color }}
        />
        <h1 className="text-xl font-semibold tracking-tight">{area.name}</h1>
      </header>

      <QuickAdd areaId={id} projects={areaProjects} />

      <Section title="Tasks" count={open.length}>
        <TaskList tasks={open} emptyText="No open tasks in this area." />
      </Section>

      {done.length > 0 && (
        <Section title="Completed" count={done.length}>
          <TaskList tasks={done} />
        </Section>
      )}
    </div>
  );
}
