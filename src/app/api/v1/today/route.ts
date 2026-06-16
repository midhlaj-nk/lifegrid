import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, tags, taskTags } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { format, startOfDay } from "date-fns";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

async function attachTagsAndSubtasks(parentTasks: typeof tasks.$inferSelect[]) {
  if (parentTasks.length === 0) return [];

  const parentIds = parentTasks.map((t) => t.id);

  const taskTagRows = await db
    .select({ taskId: taskTags.taskId, tagId: tags.id, tagName: tags.name, tagColor: tags.color })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(inArray(taskTags.taskId, parentIds));

  const subtaskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      parentId: tasks.parentId,
    })
    .from(tasks)
    .where(inArray(tasks.parentId, parentIds));

  const tagsByTask = new Map<string, { id: string; name: string; color: string }[]>();
  for (const row of taskTagRows) {
    const existing = tagsByTask.get(row.taskId) ?? [];
    existing.push({ id: row.tagId, name: row.tagName, color: row.tagColor });
    tagsByTask.set(row.taskId, existing);
  }

  const subtasksByTask = new Map<string, typeof subtaskRows>();
  for (const sub of subtaskRows) {
    const existing = subtasksByTask.get(sub.parentId!) ?? [];
    existing.push(sub);
    subtasksByTask.set(sub.parentId!, existing);
  }

  return parentTasks.map((t) => ({
    id: t.id,
    title: t.title,
    note: t.note,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    dueTime: t.dueTime,
    recurrence: t.recurrence,
    kanbanColumn: t.kanbanColumn,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    projectId: t.projectId,
    areaId: t.areaId,
    parentId: t.parentId,
    sortOrder: t.sortOrder,
    completedAt: t.completedAt,
    tags: tagsByTask.get(t.id) ?? [],
    subtasks: subtasksByTask.get(t.id) ?? [],
  }));
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = format(new Date(), "yyyy-MM-dd");
    const todayStart = startOfDay(new Date());

    // Fetch all user tasks (top-level only)
    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, user.id));

    const topLevel = allTasks.filter(
      (t) => t.parentId === null || t.parentId === undefined || t.parentId === ""
    );

    const dueTodayRaw = topLevel.filter(
      (t) => t.dueDate === today && t.status !== "done"
    );

    const overdueRaw = topLevel.filter(
      (t) => t.dueDate !== null && t.dueDate! < today && t.status !== "done"
    );

    // completedAt is stored as unix epoch seconds (integer)
    // drizzle mode:"timestamp" returns Date objects, but let's be safe
    const doneTodayFiltered = topLevel.filter((t) => {
      if (t.status !== "done" || !t.completedAt) return false;
      const completedDate =
        t.completedAt instanceof Date
          ? t.completedAt
          : new Date((t.completedAt as unknown as number) * 1000);
      return completedDate >= todayStart;
    });

    const [dueToday, overdue, doneToday] = await Promise.all([
      attachTagsAndSubtasks(dueTodayRaw),
      attachTagsAndSubtasks(overdueRaw),
      attachTagsAndSubtasks(doneTodayFiltered),
    ]);

    const total = dueToday.length + overdue.length;
    const done = doneToday.length;
    const pct = total > 0 ? Math.round((done / (total + done)) * 100) : 0;

    return NextResponse.json({
      dueToday,
      overdue,
      doneToday,
      stats: { total: total + done, done, pct },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
