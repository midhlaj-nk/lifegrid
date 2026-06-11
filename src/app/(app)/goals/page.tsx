import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { goals, goalTaskLinks, tasks } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { GoalsBoard } from "./goals-client";

export default async function GoalsPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, user.id))
    .orderBy(asc(goals.createdAt));

  const links = rows.length
    ? await db
        .select()
        .from(goalTaskLinks)
        .where(
          inArray(
            goalTaskLinks.goalId,
            rows.map((g) => g.id)
          )
        )
    : [];

  const taskIds = [...new Set(links.map((l) => l.taskId))];
  const linkedTasks = taskIds.length
    ? await db
        .select({ id: tasks.id, title: tasks.title, status: tasks.status })
        .from(tasks)
        .where(inArray(tasks.id, taskIds))
    : [];

  const allOpen = await db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status })
    .from(tasks)
    .where(eq(tasks.userId, user.id));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Goals</h1>
        <p className="text-sm text-muted-foreground">
          Long-term targets with linked tasks
        </p>
      </header>
      <GoalsBoard
        goals={rows.map((g) => ({
          ...g,
          tasks: links
            .filter((l) => l.goalId === g.id)
            .map((l) => linkedTasks.find((t) => t.id === l.taskId))
            .filter(Boolean) as { id: string; title: string; status: string }[],
        }))}
        allTasks={allOpen.filter((t) => t.status !== "done")}
      />
    </div>
  );
}
