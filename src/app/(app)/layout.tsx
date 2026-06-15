import { and, eq, isNotNull, lt, ne } from "drizzle-orm";
import { format } from "date-fns";
import { AppShell } from "@/components/shell/app-shell";
import { GlobalQuickAdd } from "@/components/shell/global-quick-add";
import { ReminderWatcher } from "@/components/shell/reminder-watcher";
import { requireUser } from "@/lib/session";
import { getSidebarData } from "@/lib/queries";
import { db } from "@/db";
import { tasks } from "@/db/schema";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const today = format(new Date(), "yyyy-MM-dd");
  const [{ areas, projects, tags }, dueSoon, overdueRows] = await Promise.all([
    getSidebarData(user.id),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        dueTime: tasks.dueTime,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, user.id),
          ne(tasks.status, "done"),
          isNotNull(tasks.dueDate),
          isNotNull(tasks.dueTime)
        )
      ),
    db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, user.id),
          ne(tasks.status, "done"),
          isNotNull(tasks.dueDate),
          lt(tasks.dueDate, today)
        )
      ),
  ]);

  const overdueCount = overdueRows.length;

  return (
    <AppShell
      areas={areas}
      projects={projects}
      tags={tags}
      userName={user.name}
      overdueCount={overdueCount}
    >
      {children}
      <GlobalQuickAdd />
      <ReminderWatcher
        tasks={dueSoon as { id: string; title: string; dueDate: string; dueTime: string }[]}
      />
    </AppShell>
  );
}
