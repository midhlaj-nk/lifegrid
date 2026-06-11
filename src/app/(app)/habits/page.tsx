import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { habits, habitChecks } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { HabitsBoard } from "./habits-client";

export default async function HabitsPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(habits)
    .where(eq(habits.userId, user.id))
    .orderBy(asc(habits.createdAt));

  const checks = rows.length
    ? await db
        .select()
        .from(habitChecks)
        .where(
          inArray(
            habitChecks.habitId,
            rows.map((h) => h.id)
          )
        )
    : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Habits</h1>
        <p className="text-sm text-muted-foreground">
          Daily consistency, visualized
        </p>
      </header>
      <HabitsBoard
        habits={rows.map((h) => ({
          ...h,
          weekdays: JSON.parse(h.weekdays) as number[],
          checks: checks
            .filter((c) => c.habitId === h.id)
            .map((c) => c.date),
        }))}
      />
    </div>
  );
}
