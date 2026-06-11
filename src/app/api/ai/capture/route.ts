import { generateObject } from "ai";
import { z } from "zod";
import { format } from "date-fns";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  events,
  finAccounts,
  finCategories,
  finTransactions,
  tags,
  tasks,
  taskTags,
} from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/worklog/server";
import { getModel } from "@/lib/ai-provider";

const captureSchema = z.object({
  kind: z.enum(["task", "expense", "event"]),
  title: z.string().describe("Clean title without dates/amounts/tags"),
  dueDate: z
    .string()
    .nullable()
    .describe("yyyy-MM-dd or null"),
  dueTime: z.string().nullable().describe("HH:mm 24h or null"),
  priority: z.number().int().min(1).max(4).describe("1 urgent .. 4 none"),
  tags: z.array(z.string()),
  amountInr: z
    .number()
    .nullable()
    .describe("for expenses: amount in rupees, else null"),
  category: z.string().nullable().describe("expense category name or null"),
  yearlyRecurring: z
    .boolean()
    .describe("for events like birthdays/anniversaries"),
});

export async function POST(req: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { text } = await req.json();
  if (!text?.trim())
    return NextResponse.json({ error: "text required" }, { status: 400 });

  let model;
  try {
    model = await getModel(user.id, "fast");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const { object } = await generateObject({
    model,
    schema: captureSchema,
    prompt: `Today is ${today} (${format(new Date(), "EEEE")}).
Parse this quick-capture text into a structured item. "paid"/"bought"/"spent"/amounts like "500rs"/"₹500" imply an expense. Birthdays/anniversaries/trips imply an event. Otherwise it's a task.

Text: """${text.trim()}"""`,
  });

  if (object.kind === "expense" && object.amountInr) {
    const [account] = await db
      .select()
      .from(finAccounts)
      .where(
        and(eq(finAccounts.userId, user.id), eq(finAccounts.archived, false))
      )
      .limit(1);
    if (!account)
      return NextResponse.json(
        { error: "No finance account yet — create one first" },
        { status: 400 }
      );
    let categoryId: string | null = null;
    if (object.category) {
      const cats = await db
        .select()
        .from(finCategories)
        .where(eq(finCategories.userId, user.id));
      categoryId =
        cats.find(
          (c) => c.name.toLowerCase() === object.category!.toLowerCase()
        )?.id ?? null;
    }
    await db.insert(finTransactions).values({
      id: randomUUID(),
      userId: user.id,
      accountId: account.id,
      categoryId,
      type: "expense",
      amountMinor: Math.round(object.amountInr * 100),
      date: object.dueDate ?? today,
      note: object.title,
    });
    return NextResponse.json({ created: "expense", item: object });
  }

  if (object.kind === "event") {
    await db.insert(events).values({
      id: randomUUID(),
      userId: user.id,
      title: object.title,
      date: object.dueDate ?? today,
      yearlyRecurring: object.yearlyRecurring,
    });
    return NextResponse.json({ created: "event", item: object });
  }

  // task (default)
  const taskId = randomUUID();
  await db.insert(tasks).values({
    id: taskId,
    userId: user.id,
    title: object.title,
    priority: object.priority,
    dueDate: object.dueDate,
    dueTime: object.dueTime,
  });
  for (const name of object.tags) {
    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, user.id), eq(tags.name, name)));
    const tagId = existing?.id ?? randomUUID();
    if (!existing)
      await db.insert(tags).values({ id: tagId, userId: user.id, name });
    await db
      .insert(taskTags)
      .values({ taskId, tagId })
      .onConflictDoNothing();
  }
  return NextResponse.json({ created: "task", item: object });
}
