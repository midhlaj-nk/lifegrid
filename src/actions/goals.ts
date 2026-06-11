"use server";

import { db } from "@/db";
import { goals, goalTaskLinks } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createGoal(input: {
  title: string;
  description?: string;
  targetDate?: string | null;
}) {
  const user = await requireUser();
  await db.insert(goals).values({
    id: randomUUID(),
    userId: user.id,
    title: input.title.trim().slice(0, 200),
    description: input.description ?? "",
    targetDate: input.targetDate ?? null,
  });
  revalidatePath("/goals");
}

export async function updateGoal(
  id: string,
  input: {
    title?: string;
    description?: string;
    targetDate?: string | null;
    manualProgress?: number;
    status?: "active" | "achieved" | "dropped";
  }
) {
  const user = await requireUser();
  await db
    .update(goals)
    .set(input)
    .where(and(eq(goals.id, id), eq(goals.userId, user.id)));
  revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
  const user = await requireUser();
  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, user.id)));
  revalidatePath("/goals");
}

export async function linkTaskToGoal(goalId: string, taskId: string) {
  await requireUser();
  await db
    .insert(goalTaskLinks)
    .values({ goalId, taskId })
    .onConflictDoNothing();
  revalidatePath("/goals");
}

export async function unlinkTaskFromGoal(goalId: string, taskId: string) {
  await requireUser();
  await db
    .delete(goalTaskLinks)
    .where(
      and(eq(goalTaskLinks.goalId, goalId), eq(goalTaskLinks.taskId, taskId))
    );
  revalidatePath("/goals");
}
