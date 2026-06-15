"use server";

import { db } from "@/db";
import { tasks, taskTags, tags } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { parseRecurrence, nextOccurrence } from "@/lib/recurrence";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

const taskInput = z.object({
  title: z.string().min(1).max(500),
  note: z.string().max(10000).optional().default(""),
  projectId: z.string().nullable().optional(),
  areaId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(4).optional().default(4),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  recurrence: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional().default([]),
});

function revalidateTaskViews() {
  revalidatePath("/", "layout");
}

export async function createTask(raw: z.input<typeof taskInput>) {
  const user = await requireUser();
  const input = taskInput.parse(raw);
  const id = randomUUID();
  await db.insert(tasks).values({
    id,
    userId: user.id,
    title: input.title,
    note: input.note,
    projectId: input.projectId ?? null,
    areaId: input.areaId ?? null,
    parentId: input.parentId ?? null,
    priority: input.priority,
    dueDate: input.dueDate ?? null,
    dueTime: input.dueTime ?? null,
    recurrence: input.recurrence ?? null,
  });
  if (input.tagIds.length) {
    await db
      .insert(taskTags)
      .values(input.tagIds.map((tagId) => ({ taskId: id, tagId })));
  }
  revalidateTaskViews();
  return id;
}

export async function updateTask(
  id: string,
  raw: Partial<z.input<typeof taskInput>>
) {
  const user = await requireUser();
  const input = taskInput.partial().parse(raw);
  const { tagIds, ...fields } = input;
  if (Object.keys(fields).length) {
    await db
      .update(tasks)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
  }
  if (tagIds) {
    await db.delete(taskTags).where(eq(taskTags.taskId, id));
    if (tagIds.length) {
      await db
        .insert(taskTags)
        .values(tagIds.map((tagId) => ({ taskId: id, tagId })));
    }
  }
  revalidateTaskViews();
}

export async function toggleTaskDone(id: string) {
  const user = await requireUser();
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
  if (!task) return;

  if (task.status === "done") {
    await db
      .update(tasks)
      .set({ status: "todo", completedAt: null, updatedAt: new Date() })
      .where(eq(tasks.id, id));
  } else {
    await db
      .update(tasks)
      .set({ status: "done", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, id));

    // Recurring: spawn next occurrence
    const rec = parseRecurrence(task.recurrence);
    if (rec && task.dueDate) {
      await db.insert(tasks).values({
        id: randomUUID(),
        userId: task.userId,
        projectId: task.projectId,
        areaId: task.areaId,
        title: task.title,
        note: task.note,
        priority: task.priority,
        dueDate: nextOccurrence(rec, task.dueDate),
        dueTime: task.dueTime,
        recurrence: task.recurrence,
      });
    }
  }
  revalidateTaskViews();
}

export async function deleteTask(id: string) {
  const user = await requireUser();
  // delete subtasks first (parentId is not FK-enforced)
  await db
    .delete(tasks)
    .where(and(eq(tasks.parentId, id), eq(tasks.userId, user.id)));
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
  revalidateTaskViews();
}

export async function setTaskStatus(
  id: string,
  status: "todo" | "doing" | "done"
) {
  const user = await requireUser();
  await db
    .update(tasks)
    .set({
      status,
      completedAt: status === "done" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
  revalidateTaskViews();
}

export async function reorderTasks(orderedIds: string[]) {
  const user = await requireUser();
  await Promise.all(
    orderedIds.map((id, i) =>
      db.update(tasks).set({ sortOrder: i }).where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    )
  );
}

/** Move a task into a kanban column. "done" completes; others reopen. */
export async function setTaskKanbanColumn(id: string, column: string) {
  const user = await requireUser();
  const done = column === "done";
  await db
    .update(tasks)
    .set({
      kanbanColumn: done ? null : column,
      status: done ? "done" : "todo",
      completedAt: done ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
  revalidateTaskViews();
}
