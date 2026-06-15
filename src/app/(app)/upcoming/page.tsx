import { addDays, format, parseISO } from "date-fns";
import { requireUser } from "@/lib/session";
import { getAllOpenTasks, getSidebarData } from "@/lib/queries";
import { QuickAdd } from "@/components/tasks/quick-add";
import { FilterableTaskList, Section } from "@/components/tasks/task-list";

export default async function UpcomingPage() {
  const user = await requireUser();
  const today = format(new Date(), "yyyy-MM-dd");
  const [all, { projects }] = await Promise.all([
    getAllOpenTasks(user.id),
    getSidebarData(user.id),
  ]);

  const open = all.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i);
    const key = format(d, "yyyy-MM-dd");
    return {
      key,
      label:
        i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEEE, d MMM"),
      tasks: open.filter((t) => t.dueDate === key),
    };
  });

  const later = open.filter(
    (t) => t.dueDate && t.dueDate > format(addDays(new Date(), 6), "yyyy-MM-dd")
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Upcoming</h1>
        <p className="text-sm text-muted-foreground">Next 7 days and beyond</p>
      </header>

      <QuickAdd projects={projects} />

      {overdue.length > 0 && (
        <Section title="Overdue" count={overdue.length} tone="danger">
          <FilterableTaskList tasks={overdue} />
        </Section>
      )}

      {days.map((d) => (
        <Section key={d.key} title={d.label} count={d.tasks.length}>
          <FilterableTaskList tasks={d.tasks} emptyText="—" />
        </Section>
      ))}

      {later.length > 0 && (
        <Section title="Later" count={later.length}>
          <FilterableTaskList
            tasks={[...later].sort((a, b) =>
              (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
            )}
          />
        </Section>
      )}
    </div>
  );
}
