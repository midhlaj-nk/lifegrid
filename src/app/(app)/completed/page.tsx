import { requireUser } from "@/lib/session";
import { getAllOpenTasks } from "@/lib/queries";
import { TaskList } from "@/components/tasks/task-list";

export default async function CompletedPage() {
  const user = await requireUser();
  const all = await getAllOpenTasks(user.id);
  const done = all
    .filter((t) => t.status === "done")
    .sort(
      (a, b) =>
        (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)
    );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Completed</h1>
        <p className="text-sm text-muted-foreground">
          {done.length} task{done.length === 1 ? "" : "s"} done
        </p>
      </header>
      <TaskList tasks={done} emptyText="Nothing completed yet." />
    </div>
  );
}
