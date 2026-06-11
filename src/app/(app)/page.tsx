import { format } from "date-fns";
import { requireUser } from "@/lib/session";
import { getAllOpenTasks, getSidebarData } from "@/lib/queries";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList, Section } from "@/components/tasks/task-list";

export default async function TodayPage() {
  const user = await requireUser();
  const today = format(new Date(), "yyyy-MM-dd");
  const [all, { projects }] = await Promise.all([
    getAllOpenTasks(user.id),
    getSidebarData(user.id),
  ]);

  const open = all.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = open.filter((t) => t.dueDate === today);
  const doneToday = all.filter(
    (t) =>
      t.status === "done" &&
      t.completedAt &&
      format(t.completedAt, "yyyy-MM-dd") === today
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM")}
        </p>
      </header>

      <QuickAdd defaultDueDate={today} projects={projects} />

      {overdue.length > 0 && (
        <Section title="Overdue" count={overdue.length} tone="danger">
          <TaskList tasks={overdue} />
        </Section>
      )}

      <Section title="Due today" count={dueToday.length}>
        <TaskList tasks={dueToday} emptyText="Nothing due today." />
      </Section>

      {doneToday.length > 0 && (
        <Section title="Completed today" count={doneToday.length}>
          <TaskList tasks={doneToday} />
        </Section>
      )}
    </div>
  );
}
