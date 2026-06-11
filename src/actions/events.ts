"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

const eventInput = z.object({
  title: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  yearlyRecurring: z.boolean().optional().default(false),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(8).optional(),
  note: z.string().max(2000).optional().default(""),
});

export async function createEvent(raw: z.input<typeof eventInput>) {
  const user = await requireUser();
  const input = eventInput.parse(raw);
  await db.insert(events).values({
    id: randomUUID(),
    userId: user.id,
    title: input.title,
    date: input.date,
    yearlyRecurring: input.yearlyRecurring,
    color: input.color ?? "#f59e0b",
    icon: input.icon ?? "🎉",
    note: input.note,
  });
  revalidatePath("/", "layout");
}

export async function updateEvent(
  id: string,
  raw: Partial<z.input<typeof eventInput>>
) {
  const user = await requireUser();
  const input = eventInput.partial().parse(raw);
  await db
    .update(events)
    .set(input)
    .where(and(eq(events.id, id), eq(events.userId, user.id)));
  revalidatePath("/", "layout");
}

export async function deleteEvent(id: string) {
  const user = await requireUser();
  await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.userId, user.id)));
  revalidatePath("/", "layout");
}
