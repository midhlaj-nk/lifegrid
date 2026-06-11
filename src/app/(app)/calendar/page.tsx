import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, tasks } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { nextEventDate } from "@/lib/events";
import { CalendarView } from "./calendar-client";

export default async function CalendarPage() {
  const user = await requireUser();
  const [taskRows, eventRows] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        status: tasks.status,
        priority: tasks.priority,
      })
      .from(tasks)
      .where(eq(tasks.userId, user.id)),
    db.select().from(events).where(eq(events.userId, user.id)),
  ]);

  const calTasks = taskRows.filter((t) => t.dueDate);
  const calEvents = eventRows.map((e) => ({
    id: e.id,
    title: e.title,
    icon: e.icon,
    color: e.color,
    date: nextEventDate(e.date, e.yearlyRecurring),
  }));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Tasks and events at a glance — drag a task to reschedule
        </p>
      </header>
      <CalendarView
        tasks={calTasks as { id: string; title: string; dueDate: string; status: string; priority: number }[]}
        events={calEvents}
      />
    </div>
  );
}
