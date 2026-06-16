import { format } from "date-fns";
import { requireUser } from "@/lib/session";
import { getAllOpenTasks, getSidebarData } from "@/lib/queries";
import { QuickAdd } from "@/components/tasks/quick-add";
import { FilterableTaskList, Section } from "@/components/tasks/task-list";

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

  const todayTotal = dueToday.length + doneToday.filter((t) => t.dueDate === today).length;
  const todayDone = doneToday.filter((t) => t.dueDate === today).length;
  const pct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Today</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, d MMMM")}
            </p>
          </div>
          {todayTotal > 0 && (
            <span className="text-sm text-muted-foreground">
              {todayDone}/{todayTotal}
            </span>
          )}
        </div>
        {todayTotal > 0 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </header>

      <QuickAdd defaultDueDate={today} projects={projects} />

      {overdue.length > 0 && (
        <Section title="Overdue" count={overdue.length} tone="danger">
          <FilterableTaskList tasks={overdue} />
        </Section>
      )}

      <Section title="Due today" count={dueToday.length}>
        <FilterableTaskList tasks={dueToday} emptyText="Nothing due today." />
      </Section>

      {doneToday.length > 0 && (
        <Section title="Completed today" count={doneToday.length}>
          <FilterableTaskList tasks={doneToday} />
        </Section>
      )}
    </div>
  );
}
