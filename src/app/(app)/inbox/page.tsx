import { requireUser } from "@/lib/session";
import { getAllOpenTasks, getSidebarData } from "@/lib/queries";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList } from "@/components/tasks/task-list";

export default async function InboxPage() {
  const user = await requireUser();
  const [all, { projects }] = await Promise.all([
    getAllOpenTasks(user.id),
    getSidebarData(user.id),
  ]);

  // Inbox = open tasks with no project, no area, no due date
  const inbox = all.filter(
    (t) => t.status !== "done" && !t.projectId && !t.areaId && !t.dueDate
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Unsorted tasks — no project, no date
        </p>
      </header>
      <QuickAdd projects={projects} />
      <TaskList tasks={inbox} emptyText="Inbox zero." />
    </div>
  );
}
