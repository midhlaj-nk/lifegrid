"use server";

import { db } from "@/db";
import { tags, tasks, taskTags } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { parseQuickAdd } from "@/lib/nl-parse";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function quickAddTask(raw: string) {
  const user = await requireUser();
  const parsed = parseQuickAdd(raw);
  if (!parsed.title) return { error: "Empty task" };

  // find-or-create tags
  const tagIds: string[] = [];
  for (const name of parsed.tagNames) {
    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, user.id), eq(tags.name, name)));
    if (existing) tagIds.push(existing.id);
    else {
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
    priority: parsed.priority,
    dueDate: parsed.dueDate,
    dueTime: parsed.dueTime,
    recurrence: parsed.recurrence ? JSON.stringify(parsed.recurrence) : null,
  });
  if (tagIds.length) {
    await db
      .insert(taskTags)
      .values(tagIds.map((tagId) => ({ taskId: id, tagId })));
  }

  revalidatePath("/", "layout");
  return { ok: true, parsed };
}
