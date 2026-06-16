import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, tags, taskTags } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

async function attachTagsAndSubtasks(parentTasks: typeof tasks.$inferSelect[]) {
  if (parentTasks.length === 0) return [];

  const parentIds = parentTasks.map((t) => t.id);

  // Fetch all task_tags for parent tasks
  const taskTagRows = await db
    .select({ taskId: taskTags.taskId, tagId: tags.id, tagName: tags.name, tagColor: tags.color })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(inArray(taskTags.taskId, parentIds));

  // Fetch subtasks
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

  // Group tags and subtasks by parent task id
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "all";
    const dueDate = searchParams.get("dueDate");
    const search = searchParams.get("search");

    // parentId is nullable — filter for rows where parentId IS NULL
    // We'll do a post-filter instead since drizzle sqlite isNull can be tricky
    const rawTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, user.id))
      .orderBy(desc(tasks.createdAt));

    let filtered = rawTasks.filter((t) => t.parentId === null || t.parentId === undefined || t.parentId === "");

    if (status !== "all") {
      filtered = filtered.filter((t) => t.status === status);
    }

    if (dueDate) {
      filtered = filtered.filter((t) => t.dueDate === dueDate);
    }

    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(lower));
    }

    const result = await attachTagsAndSubtasks(filtered);
    return NextResponse.json({ tasks: result });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      title,
      note,
      priority,
      dueDate,
      dueTime,
      projectId,
      areaId,
      tagIds,
      recurrence,
    } = body as {
      title: string;
      note?: string;
      priority?: number;
      dueDate?: string;
      dueTime?: string;
      projectId?: string;
      areaId?: string;
      tagIds?: string[];
      recurrence?: string;
    };

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const id = randomUUID();
    const now = new Date();

    await db.insert(tasks).values({
      id,
      userId: user.id,
      title,
      note: note ?? "",
      priority: priority ?? 4,
      dueDate: dueDate ?? null,
      dueTime: dueTime ?? null,
      projectId: projectId ?? null,
      areaId: areaId ?? null,
      recurrence: recurrence ?? null,
      status: "todo",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });

    if (tagIds && tagIds.length > 0) {
      await db.insert(taskTags).values(
        tagIds.map((tagId) => ({ taskId: id, tagId }))
      );
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
