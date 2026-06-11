import { format } from "date-fns";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  dashboardPrefs,
  events,
  goals,
  habitChecks,
  habits,
  notes,
} from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getAllOpenTasks } from "@/lib/queries";
import { nextEventDate, daysUntil } from "@/lib/events";
import {
  Dashboard,
  DEFAULT_WIDGETS,
  type WidgetData,
  type WidgetPrefRow,
} from "./dashboard-client";

export default async function HomePage() {
  const user = await requireUser();
  const today = format(new Date(), "yyyy-MM-dd");

  const [allTasks, eventRows, habitRows, goalRows, noteRows, prefRow] =
    await Promise.all([
      getAllOpenTasks(user.id),
      db.select().from(events).where(eq(events.userId, user.id)),
      db
        .select()
        .from(habits)
        .where(eq(habits.userId, user.id))
        .orderBy(asc(habits.createdAt)),
      db
        .select()
        .from(goals)
        .where(and(eq(goals.userId, user.id), eq(goals.status, "active")))
        .orderBy(asc(goals.createdAt)),
      db
        .select({
          id: notes.id,
          title: notes.title,
          icon: notes.icon,
          updatedAt: notes.updatedAt,
        })
        .from(notes)
        .where(eq(notes.userId, user.id))
        .orderBy(desc(notes.updatedAt))
        .limit(5),
      db
        .select()
        .from(dashboardPrefs)
        .where(eq(dashboardPrefs.userId, user.id)),
    ]);

  const todayChecks = habitRows.length
    ? await db
        .select()
        .from(habitChecks)
        .where(
          and(
            inArray(
              habitChecks.habitId,
              habitRows.map((h) => h.id)
            ),
            eq(habitChecks.date, today)
          )
        )
    : [];

  const open = allTasks.filter((t) => t.status !== "done");

  const data: WidgetData = {
    today,
    overdue: open.filter((t) => t.dueDate && t.dueDate < today),
    dueToday: open.filter((t) => t.dueDate === today),
    upcoming: open
      .filter((t) => t.dueDate && t.dueDate > today)
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
      .slice(0, 8),
    countdowns: eventRows
      .map((e) => {
        const next = nextEventDate(e.date, e.yearlyRecurring);
        return {
          id: e.id,
          title: e.title,
          icon: e.icon,
          color: e.color,
          days: daysUntil(next),
          date: next,
        };
      })
      .filter((e) => e.days >= 0)
      .sort((a, b) => a.days - b.days)
      .slice(0, 6),
    habits: habitRows.map((h) => ({
      id: h.id,
      name: h.name,
      icon: h.icon,
      color: h.color,
      weekdays: JSON.parse(h.weekdays) as number[],
      checkedToday: todayChecks.some((c) => c.habitId === h.id),
    })),
    goals: goalRows.map((g) => ({
      id: g.id,
      title: g.title,
      progress: g.manualProgress,
      targetDate: g.targetDate,
    })),
    recentNotes: noteRows.map((n) => ({
      id: n.id,
      title: n.title,
      icon: n.icon,
    })),
  };

  const prefs: WidgetPrefRow[] = prefRow[0]
    ? JSON.parse(prefRow[0].widgets)
    : DEFAULT_WIDGETS;

  return <Dashboard userName={user.name} data={data} prefs={prefs} />;
}
