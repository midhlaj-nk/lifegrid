import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, tags, taskTags } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

async function getTaskWithMeta(taskId: string, userId: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

  if (!task) return null;

  const taskTagRows = await db
    .select({ tagId: tags.id, tagName: tags.name, tagColor: tags.color })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(eq(taskTags.taskId, taskId));

  const subtaskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      parentId: tasks.parentId,
    })
    .from(tasks)
    .where(eq(tasks.parentId, taskId));

  return {
    id: task.id,
    title: task.title,
    note: task.note,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    recurrence: task.recurrence,
    kanbanColumn: task.kanbanColumn,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    projectId: task.projectId,
    areaId: task.areaId,
    parentId: task.parentId,
    sortOrder: task.sortOrder,
    completedAt: task.completedAt,
    tags: taskTagRows.map((r) => ({ id: r.tagId, name: r.tagName, color: r.tagColor })),
    subtasks: subtaskRows,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const task = await getTaskWithMeta(id, user.id);

    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ task });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Verify ownership
    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { tagIds, ...taskFields } = body as {
      tagIds?: string[];
      title?: string;
      note?: string;
      status?: "todo" | "doing" | "done";
      priority?: number;
      dueDate?: string | null;
      dueTime?: string | null;
      projectId?: string | null;
      areaId?: string | null;
      recurrence?: string | null;
      kanbanColumn?: string | null;
      sortOrder?: number;
      parentId?: string | null;
      completedAt?: Date | null;
    };

    const updateData: Record<string, unknown> = { ...taskFields, updatedAt: new Date() };

    await db.update(tasks).set(updateData).where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

    if (tagIds !== undefined) {
      await db.delete(taskTags).where(eq(taskTags.taskId, id));
      if (tagIds.length > 0) {
        await db.insert(taskTags).values(tagIds.map((tagId) => ({ taskId: id, tagId })));
      }
    }

    const updated = await getTaskWithMeta(id, user.id);
    return NextResponse.json({ task: updated });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Verify ownership
    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete subtasks first
    const subtasks = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.parentId, id));

    if (subtasks.length > 0) {
      const subtaskIds = subtasks.map((s) => s.id);
      await db.delete(taskTags).where(inArray(taskTags.taskId, subtaskIds));
      await db.delete(tasks).where(inArray(tasks.id, subtaskIds));
    }

    // Delete task_tags for the parent task
    await db.delete(taskTags).where(eq(taskTags.taskId, id));

    // Delete the task
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
