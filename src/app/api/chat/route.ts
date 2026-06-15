import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { endOfMonth, format } from "date-fns";
import { and, asc, desc, eq, gte, like, lte, ne } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import {
  events,
  finCategories,
  finTransactions,
  goals,
  habits,
  notes,
  projects,
  tasks,
} from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/worklog/server";
import { getModel } from "@/lib/ai-provider";
import { formatINR } from "@/lib/money";

export const maxDuration = 60;

// SECURITY: no tool in this file may read from vaultItems/vaultMeta.
// The vault is client-side encrypted and out of bounds for AI, period.

function buildTools(userId: string) {
  return {
    listTasks: tool({
      description:
        "List the user's tasks. Filter by status (todo/doing/done) and/or due date range (yyyy-MM-dd).",
      inputSchema: z.object({
        status: z.enum(["todo", "doing", "done"]).optional(),
        dueAfter: z.string().optional(),
        dueBefore: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
      execute: async ({ status, dueAfter, dueBefore, limit }) => {
        const conds = [eq(tasks.userId, userId)];
        if (status) conds.push(eq(tasks.status, status));
        else conds.push(ne(tasks.status, "done"));
        if (dueAfter) conds.push(gte(tasks.dueDate, dueAfter));
        if (dueBefore) conds.push(lte(tasks.dueDate, dueBefore));
        const rows = await db
          .select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            priority: tasks.priority,
            dueDate: tasks.dueDate,
            projectId: tasks.projectId,
          })
          .from(tasks)
          .where(and(...conds))
          .orderBy(asc(tasks.dueDate))
          .limit(limit);
        return rows;
      },
    }),
    createTask: tool({
      description:
        "Create a new task for the user. Use when they ask to add/remember something to do.",
      inputSchema: z.object({
        title: z.string().min(1).max(300),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        priority: z.number().int().min(1).max(4).default(4),
      }),
      execute: async ({ title, dueDate, priority }) => {
        const id = randomUUID();
        await db.insert(tasks).values({
          id,
          userId,
          title,
          dueDate: dueDate ?? null,
          priority,
        });
        return { created: true, id, title };
      },
    }),
    searchNotes: tool({
      description: "Search the user's notes by title keyword.",
      inputSchema: z.object({ query: z.string().min(1) }),
      execute: async ({ query }) => {
        const rows = await db
          .select({ id: notes.id, title: notes.title, content: notes.content })
          .from(notes)
          .where(and(eq(notes.userId, userId), like(notes.title, `%${query}%`)))
          .limit(10);
        return rows.map((r) => ({
          id: r.id,
          title: r.title,
          // plaintext extraction from BlockNote JSON, truncated
          excerpt: r.content
            .replace(/"text":"((?:[^"\\]|\\.)*)"/g, " $1 ")
            .replace(/[{}[\]"]/g, " ")
            .replace(/\s+/g, " ")
            .slice(0, 500),
        }));
      },
    }),
    financeSummary: tool({
      description:
        "Income, expenses and per-category spending for a month (yyyy-MM). Amounts returned pre-formatted in INR.",
      inputSchema: z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
      }),
      execute: async ({ month }) => {
        const txs = await db
          .select()
          .from(finTransactions)
          .where(
            and(
              eq(finTransactions.userId, userId),
              gte(finTransactions.date, `${month}-01`),
              lte(
                finTransactions.date,
                format(endOfMonth(new Date(`${month}-01T00:00:00`)), "yyyy-MM-dd")
              )
            )
          );
        const cats = await db
          .select()
          .from(finCategories)
          .where(eq(finCategories.userId, userId));
        const income = txs
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amountMinor, 0);
        const expense = txs
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amountMinor, 0);
        const byCat = new Map<string, number>();
        for (const t of txs) {
          if (t.type !== "expense") continue;
          const name =
            cats.find((c) => c.id === t.categoryId)?.name ?? "Uncategorized";
          byCat.set(name, (byCat.get(name) ?? 0) + t.amountMinor);
        }
        return {
          month,
          income: formatINR(income),
          expense: formatINR(expense),
          net: formatINR(income - expense),
          byCategory: [...byCat.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name, amt]) => ({ category: name, spent: formatINR(amt) })),
          transactionCount: txs.length,
        };
      },
    }),
    listEvents: tool({
      description: "List the user's countdown events (birthdays, deadlines…).",
      inputSchema: z.object({}),
      execute: async () => {
        return db
          .select({
            title: events.title,
            date: events.date,
            yearlyRecurring: events.yearlyRecurring,
          })
          .from(events)
          .where(eq(events.userId, userId))
          .orderBy(asc(events.date));
      },
    }),
    listProjectsAndGoals: tool({
      description: "List the user's projects, goals, and habits.",
      inputSchema: z.object({}),
      execute: async () => {
        const [p, g, h] = await Promise.all([
          db
            .select({ id: projects.id, name: projects.name })
            .from(projects)
            .where(eq(projects.userId, userId)),
          db
            .select({
              title: goals.title,
              status: goals.status,
              targetDate: goals.targetDate,
              manualProgress: goals.manualProgress,
            })
            .from(goals)
            .where(eq(goals.userId, userId)),
          db
            .select({ name: habits.name })
            .from(habits)
            .where(eq(habits.userId, userId)),
        ]);
        return { projects: p, goals: g, habits: h.map((x) => x.name) };
      },
    }),
    listRecentTransactions: tool({
      description: "Most recent finance transactions (formatted INR).",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ limit }) => {
        const txs = await db
          .select()
          .from(finTransactions)
          .where(eq(finTransactions.userId, userId))
          .orderBy(desc(finTransactions.date))
          .limit(limit);
        return txs.map((t) => ({
          date: t.date,
          type: t.type,
          amount: formatINR(t.amountMinor),
          note: t.note,
        }));
      },
    }),
  };
}

export async function POST(req: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  let model;
  try {
    model = await getModel(user.id, "chat");
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model,
    system: `You are the assistant inside "Life Grid", ${user.name}'s personal productivity app (tasks, notes, calendar, habits, goals, finance). Today is ${format(new Date(), "EEEE, yyyy-MM-dd")}. Currency is INR.
Use the tools to answer from real data; never invent tasks or numbers. Be concise and direct. When asked to add something to do, use createTask.
You have no access to the user's credentials vault — if asked, say it is end-to-end encrypted and off-limits.`,
    messages: await convertToModelMessages(messages),
    tools: buildTools(user.id),
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
