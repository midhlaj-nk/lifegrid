"use server";

import { db } from "@/db";
import { habits, habitChecks } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createHabit(input: {
  name: string;
  icon?: string;
  color?: string;
  weekdays?: number[];
}) {
  const user = await requireUser();
  await db.insert(habits).values({
    id: randomUUID(),
    userId: user.id,
    name: input.name.trim().slice(0, 100),
    icon: input.icon ?? "✅",
    color: input.color ?? "#10b981",
    weekdays: JSON.stringify(input.weekdays ?? []),
  });
  revalidatePath("/", "layout");
}

export async function deleteHabit(id: string) {
  const user = await requireUser();
  await db
    .delete(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, user.id)));
  revalidatePath("/", "layout");
}

export async function toggleHabitCheck(habitId: string, dateStr: string) {
  const user = await requireUser();
  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)));
  if (!habit) return;

  const [existing] = await db
    .select()
    .from(habitChecks)
    .where(
      and(eq(habitChecks.habitId, habitId), eq(habitChecks.date, dateStr))
    );
  if (existing) {
    await db
      .delete(habitChecks)
      .where(
        and(eq(habitChecks.habitId, habitId), eq(habitChecks.date, dateStr))
      );
  } else {
    await db.insert(habitChecks).values({ habitId, date: dateStr });
  }
  revalidatePath("/", "layout");
}
