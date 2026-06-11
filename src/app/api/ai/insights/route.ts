import { generateText } from "ai";
import { NextResponse } from "next/server";
import { format, subDays, subMonths } from "date-fns";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  events,
  finBudgets,
  finCategories,
  finTransactions,
  habitChecks,
  habits,
  tasks,
} from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/worklog/server";
import { getModel } from "@/lib/ai-provider";
import { formatINR } from "@/lib/money";

export const maxDuration = 60;

async function buildContext(userId: string, kind: string): Promise<string> {
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  if (kind === "daily") {
    const [open, eventRows, habitRows] = await Promise.all([
      db
        .select({
          title: tasks.title,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          dueTime: tasks.dueTime,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, userId))),
      db.select().from(events).where(eq(events.userId, userId)),
      db.select().from(habits).where(eq(habits.userId, userId)),
    ]);
    const relevant = open.filter(
      (t) => t.status !== "done" && (!t.dueDate || t.dueDate <= today)
    );
    return `Today: ${today} (${format(new Date(), "EEEE")})
Open tasks due today or overdue:
${relevant.map((t) => `- [P${t.priority}] ${t.title}${t.dueDate ? ` (due ${t.dueDate}${t.dueTime ? " " + t.dueTime : ""})` : ""}`).join("\n") || "(none)"}
Events: ${eventRows.map((e) => `${e.title} on ${e.date}`).join("; ") || "(none)"}
Habits to do: ${habitRows.map((h) => h.name).join(", ") || "(none)"}`;
  }

  if (kind === "spending") {
    const threeMonthsAgo = format(subMonths(new Date(), 3), "yyyy-MM-01");
    const [txs, cats, budgets] = await Promise.all([
      db
        .select()
        .from(finTransactions)
        .where(
          and(
            eq(finTransactions.userId, userId),
            gte(finTransactions.date, threeMonthsAgo)
          )
        ),
      db.select().from(finCategories).where(eq(finCategories.userId, userId)),
      db.select().from(finBudgets).where(eq(finBudgets.userId, userId)),
    ]);
    const catName = (id: string | null) =>
      cats.find((c) => c.id === id)?.name ?? "Uncategorized";
    const lines = txs
      .filter((t) => t.type === "expense")
      .map((t) => `${t.date} | ${catName(t.categoryId)} | ${formatINR(t.amountMinor)} | ${t.note}`);
    const budgetLines = budgets.map(
      (b) => `${catName(b.categoryId)}: limit ${formatINR(b.monthlyLimitMinor)}/month`
    );
    return `Last 3 months of expenses (date | category | amount | note):
${lines.slice(0, 400).join("\n") || "(none)"}
Budgets: ${budgetLines.join("; ") || "(none)"}`;
  }

  // weekly
  const [allTasks, habitRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.userId, userId)),
    db.select().from(habits).where(eq(habits.userId, userId)),
  ]);
  const checks = habitRows.length
    ? await db
        .select()
        .from(habitChecks)
        .where(
          and(
            inArray(
              habitChecks.habitId,
              habitRows.map((h) => h.id)
            ),
            gte(habitChecks.date, weekAgo)
          )
        )
    : [];
  const doneThisWeek = allTasks.filter(
    (t) =>
      t.status === "done" &&
      t.completedAt &&
      format(t.completedAt, "yyyy-MM-dd") >= weekAgo
  );
  const slipped = allTasks.filter(
    (t) => t.status !== "done" && t.dueDate && t.dueDate < today
  );
  const txs = await db
    .select()
    .from(finTransactions)
    .where(
      and(eq(finTransactions.userId, userId), gte(finTransactions.date, weekAgo))
    );
  const spent = txs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amountMinor, 0);
  return `Week ${weekAgo} → ${today}
Completed tasks (${doneThisWeek.length}): ${doneThisWeek.map((t) => t.title).join("; ") || "(none)"}
Overdue/slipped (${slipped.length}): ${slipped.map((t) => `${t.title} (due ${t.dueDate})`).join("; ") || "(none)"}
Open tasks total: ${allTasks.filter((t) => t.status !== "done").length}
Habit checks this week: ${habitRows.map((h) => `${h.name}: ${checks.filter((c) => c.habitId === h.id).length}`).join(", ") || "(none)"}
Spent this week: ${formatINR(spent)}`;
}

const PROMPTS: Record<string, string> = {
  weekly: `Write a short, honest weekly review based on the data. Sections: "Done" (celebrate concisely), "Slipped" (no guilt-tripping, just facts), "Habits", "Money", "Focus for next week" (3 concrete suggestions max). Use markdown headers and keep it tight.`,
  daily: `Order today's work into a practical plan: what to do first (most urgent/highest priority), what fits after, habits to slot in. Be specific and brief — a plan someone actually follows. Markdown list format.`,
  spending: `Analyze the spending data. Call out anomalies (categories notably above their usual pattern), possibly-unused recurring costs, and 2-3 practical observations. Mention budget overruns vs limits where present. Keep it short and concrete, INR amounts.`,
};

export async function POST(req: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { kind } = await req.json();
  if (!PROMPTS[kind])
    return NextResponse.json({ error: "bad kind" }, { status: 400 });

  let model;
  try {
    model = await getModel(user.id, "chat");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const context = await buildContext(user.id, kind);
  const { text } = await generateText({
    model,
    prompt: `${PROMPTS[kind]}\n\nDATA:\n${context}`,
  });

  return NextResponse.json({ result: text.trim() });
}
