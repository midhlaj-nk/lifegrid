"use server";

import { db } from "@/db";
import { tags, tasks, taskTags } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { parseQuickAdd } from "@/lib/nl-parse";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function quickAddTask(
  raw: string,
  overrides?: {
    dueDate?: string | null;
    dueTime?: string | null;
    priority?: number;
    tagIds?: string[];
    projectId?: string | null;
    recurrenceOverride?: string | null;
  }
) {
  const user = await requireUser();
  const parsed = parseQuickAdd(raw);
  if (!parsed.title) return { error: "Empty task" };

  // NL tags (find-or-create) + explicit tag IDs merged
  const tagIds: string[] = [...(overrides?.tagIds ?? [])];
  for (const name of parsed.tagNames) {
    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, user.id), eq(tags.name, name)));
    if (existing) {
      if (!tagIds.includes(existing.id)) tagIds.push(existing.id);
    } else {
      const id = randomUUID();
      await db.insert(tags).values({ id, userId: user.id, name });
      tagIds.push(id);
    }
  }

  const id = randomUUID();
  await db.insert(tasks).values({
    id,
    userId: user.id,
    title: parsed.title,
    priority: overrides?.priority ?? parsed.priority,
    dueDate: overrides?.dueDate !== undefined ? overrides.dueDate : parsed.dueDate,
    dueTime: overrides?.dueTime !== undefined ? overrides.dueTime : parsed.dueTime,
    recurrence: overrides?.recurrenceOverride !== undefined
      ? overrides.recurrenceOverride
      : (parsed.recurrence ? JSON.stringify(parsed.recurrence) : null),
    projectId: overrides?.projectId ?? null,
  });

  if (tagIds.length) {
    await db
      .insert(taskTags)
      .values(tagIds.map((tagId) => ({ taskId: id, tagId })));
  }

  revalidatePath("/", "layout");
  return { ok: true, id, parsed };
}
