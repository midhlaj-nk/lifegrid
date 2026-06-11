import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getTagTasks } from "@/lib/queries";
import { TaskList } from "@/components/tasks/task-list";

export default async function TagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [tag] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, user.id)));
  if (!tag) notFound();

  const tasks = await getTagTasks(user.id, id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          <span style={{ color: tag.color }}>#</span>
          {tag.name}
        </h1>
      </header>
      <TaskList tasks={tasks} emptyText="No tasks with this tag." />
    </div>
  );
}
