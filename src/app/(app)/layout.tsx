import { and, eq, isNotNull, ne } from "drizzle-orm";
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
  const [{ areas, projects, tags }, dueSoon] = await Promise.all([
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
  ]);

  return (
    <AppShell
      areas={areas}
      projects={projects}
      tags={tags}
      userName={user.name}
    >
      {children}
      <GlobalQuickAdd />
      <ReminderWatcher
        tasks={dueSoon as { id: string; title: string; dueDate: string; dueTime: string }[]}
      />
    </AppShell>
  );
}
