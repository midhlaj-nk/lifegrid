import { TaskItem } from "./task-item";
import type { TaskWithMeta } from "@/lib/queries";

export function TaskList({
  tasks,
  emptyText = "Nothing here. Enjoy the calm.",
}: {
  tasks: TaskWithMeta[];
  emptyText?: string;
}) {
  if (!tasks.length) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }
  return (
    <div className="space-y-0.5">
      {tasks.map((t) => (
        <TaskItem key={t.id} task={t} />
      ))}
    </div>
  );
}

export function Section({
  title,
  children,
  count,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  count?: number;
  tone?: "danger";
}) {
  return (
    <section className="space-y-2">
      <h2
        className={
          tone === "danger"
            ? "text-sm font-semibold text-red-500"
            : "text-sm font-semibold text-foreground"
        }
      >
        {title}
        {count !== undefined && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {count}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}
