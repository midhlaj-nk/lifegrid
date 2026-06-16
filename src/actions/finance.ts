"use server";

import { db } from "@/db";
import {
  finAccounts,
  finBudgets,
  finCategories,
  finLent,
  finRules,
  finSavingsGoals,
  finSubscriptions,
  finTransactions,
} from "@/db/schema";
import { requireUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { addDays, addMonths, addYears, format, parseISO } from "date-fns";

function bump() {
  revalidatePath("/finance", "layout");
}

// ---------- categories ----------

const DEFAULT_CATEGORIES: { name: string; icon: string; kind: "expense" | "income" }[] = [
  { name: "Food", icon: "🍔", kind: "expense" },
  { name: "Groceries", icon: "🛒", kind: "expense" },
  { name: "Transport", icon: "🚌", kind: "expense" },
  { name: "Rent", icon: "🏠", kind: "expense" },
  { name: "Utilities", icon: "💡", kind: "expense" },
  { name: "Shopping", icon: "🛍️", kind: "expense" },
  { name: "Health", icon: "🏥", kind: "expense" },
  { name: "Entertainment", icon: "🎬", kind: "expense" },
  { name: "Subscriptions", icon: "📺", kind: "expense" },
  { name: "Other", icon: "💸", kind: "expense" },
  { name: "Salary", icon: "💼", kind: "income" },
  { name: "Freelance", icon: "🧑‍💻", kind: "income" },
  { name: "Other income", icon: "💰", kind: "income" },
];

export async function getQuickFinanceData() {
  const user = await requireUser();
  const [accounts, categories] = await Promise.all([
    db.select({ id: finAccounts.id, name: finAccounts.name })
      .from(finAccounts)
      .where(eq(finAccounts.userId, user.id)),
    db.select({ id: finCategories.id, name: finCategories.name, icon: finCategories.icon, kind: finCategories.kind })
      .from(finCategories)
      .where(eq(finCategories.userId, user.id)),
  ]);
  return { accounts, categories };
}

export async function ensureDefaultCategories() {
  const user = await requireUser();
  const existing = await db
    .select()
    .from(finCategories)
    .where(eq(finCategories.userId, user.id));
  if (existing.length) return existing;
  const rows = DEFAULT_CATEGORIES.map((c) => ({
    id: randomUUID(),
    userId: user.id,
    ...c,
  }));
  await db.insert(finCategories).values(rows);
  return rows.map((r) => ({ ...r }));
}

export async function createCategory(input: {
  name: string;
  icon?: string;
  kind: "expense" | "income";
}) {
  const user = await requireUser();
  await db.insert(finCategories).values({
    id: randomUUID(),
    userId: user.id,
    name: input.name.trim().slice(0, 60),
    icon: input.icon ?? "💸",
    kind: input.kind,
  });
  bump();
}

// ---------- accounts ----------

export async function createFinAccount(input: {
  name: string;
  type: "bank" | "cash" | "card" | "upi";
  openingBalance?: number; // paise
  color?: string;
}) {
  const user = await requireUser();
  await db.insert(finAccounts).values({
    id: randomUUID(),
    userId: user.id,
    name: input.name.trim().slice(0, 80),
    type: input.type,
    openingBalanceMinor: input.openingBalance ?? 0,
    color: input.color ?? "#6366f1",
  });
  bump();
}

export async function updateFinAccount(
  id: string,
  input: { name?: string; archived?: boolean; color?: string }
) {
  const user = await requireUser();
  await db
    .update(finAccounts)
    .set(input)
    .where(and(eq(finAccounts.id, id), eq(finAccounts.userId, user.id)));
  bump();
}

export async function deleteFinAccount(id: string) {
  const user = await requireUser();
  await db
    .delete(finAccounts)
    .where(and(eq(finAccounts.id, id), eq(finAccounts.userId, user.id)));
  bump();
}

// ---------- transactions ----------

export interface TxInput {
  accountId: string;
  categoryId?: string | null;
  type: "expense" | "income" | "transfer";
  amountMinor: number;
  date: string;
  note?: string;
  transferToAccountId?: string | null;
  originalAmount?: string | null;
  originalCurrency?: string | null;
  subscriptionId?: string | null;
}

export async function createTransaction(input: TxInput) {
  const user = await requireUser();
  if (!input.amountMinor || input.amountMinor <= 0)
    return { error: "Amount must be positive" };
  await db.insert(finTransactions).values({
    id: randomUUID(),
    userId: user.id,
    accountId: input.accountId,
    categoryId: input.categoryId ?? null,
    type: input.type,
    amountMinor: input.amountMinor,
    date: input.date,
    note: input.note ?? "",
    transferToAccountId:
      input.type === "transfer" ? (input.transferToAccountId ?? null) : null,
    originalAmount: input.originalAmount ?? null,
    originalCurrency: input.originalCurrency ?? null,
    subscriptionId: input.subscriptionId ?? null,
  });
  bump();
  return { ok: true };
}

export async function createTransactionsBulk(inputs: TxInput[]) {
  const user = await requireUser();
  const rows = inputs
    .filter((i) => i.amountMinor > 0)
    .map((i) => ({
      id: randomUUID(),
      userId: user.id,
      accountId: i.accountId,
      categoryId: i.categoryId ?? null,
      type: i.type,
      amountMinor: i.amountMinor,
      date: i.date,
      note: i.note ?? "",
      transferToAccountId: null,
      originalAmount: null,
      originalCurrency: null,
      subscriptionId: null,
    }));
  if (rows.length) await db.insert(finTransactions).values(rows);
  bump();
  return { imported: rows.length };
}

export async function updateTransaction(
  id: string,
  input: {
    amountMinor?: number;
    categoryId?: string | null;
    date?: string;
    note?: string;
    accountId?: string;
  }
) {
  const user = await requireUser();
  await db
    .update(finTransactions)
    .set(input)
    .where(and(eq(finTransactions.id, id), eq(finTransactions.userId, user.id)));
  bump();
}

export async function deleteCategory(id: string) {
  const user = await requireUser();
  await db
    .delete(finCategories)
    .where(and(eq(finCategories.id, id), eq(finCategories.userId, user.id)));
  bump();
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();
  await db
    .delete(finTransactions)
    .where(and(eq(finTransactions.id, id), eq(finTransactions.userId, user.id)));
  bump();
}

// ---------- budgets ----------

export async function setBudget(categoryId: string, monthlyLimitMinor: number) {
  const user = await requireUser();
  const [existing] = await db
    .select()
    .from(finBudgets)
    .where(
      and(eq(finBudgets.userId, user.id), eq(finBudgets.categoryId, categoryId))
    );
  if (monthlyLimitMinor <= 0) {
    if (existing)
      await db.delete(finBudgets).where(eq(finBudgets.id, existing.id));
  } else if (existing) {
    await db
      .update(finBudgets)
      .set({ monthlyLimitMinor })
      .where(eq(finBudgets.id, existing.id));
  } else {
    await db.insert(finBudgets).values({
      id: randomUUID(),
      userId: user.id,
      categoryId,
      monthlyLimitMinor,
    });
  }
  bump();
}

// ---------- subscriptions ----------

function nextDue(cadence: "weekly" | "monthly" | "yearly", from: string): string {
  const d = parseISO(from);
  if (cadence === "weekly") return format(addDays(d, 7), "yyyy-MM-dd");
  if (cadence === "monthly") return format(addMonths(d, 1), "yyyy-MM-dd");
  return format(addYears(d, 1), "yyyy-MM-dd");
}

export async function createSubscription(input: {
  name: string;
  amountMinor: number;
  accountId: string;
  categoryId?: string | null;
  cadence: "weekly" | "monthly" | "yearly";
  nextDueDate: string;
  autoLog?: boolean;
}) {
  const user = await requireUser();
  await db.insert(finSubscriptions).values({
    id: randomUUID(),
    userId: user.id,
    name: input.name.trim().slice(0, 80),
    amountMinor: input.amountMinor,
    accountId: input.accountId,
    categoryId: input.categoryId ?? null,
    cadence: input.cadence,
    nextDueDate: input.nextDueDate,
    autoLog: input.autoLog ?? true,
  });
  bump();
}

export async function updateSubscription(
  id: string,
  input: { active?: boolean; autoLog?: boolean }
) {
  const user = await requireUser();
  await db
    .update(finSubscriptions)
    .set(input)
    .where(
      and(eq(finSubscriptions.id, id), eq(finSubscriptions.userId, user.id))
    );
  bump();
}

export async function deleteSubscription(id: string) {
  const user = await requireUser();
  await db
    .delete(finSubscriptions)
    .where(
      and(eq(finSubscriptions.id, id), eq(finSubscriptions.userId, user.id))
    );
  bump();
}

/** Log every overdue auto-log subscription occurrence. Idempotent per day. */
export async function processDueSubscriptions() {
  const user = await requireUser();
  const today = format(new Date(), "yyyy-MM-dd");
  const subs = await db
    .select()
    .from(finSubscriptions)
    .where(
      and(
        eq(finSubscriptions.userId, user.id),
        eq(finSubscriptions.active, true),
        eq(finSubscriptions.autoLog, true)
      )
    );

  let logged = 0;
  for (const sub of subs) {
    let due = sub.nextDueDate;
    // catch up multiple missed periods, bounded for safety
    for (let i = 0; i < 24 && due <= today; i++) {
      await db.insert(finTransactions).values({
        id: randomUUID(),
        userId: user.id,
        accountId: sub.accountId,
        categoryId: sub.categoryId,
        type: "expense",
        amountMinor: sub.amountMinor,
        date: due,
        note: `${sub.name} (subscription)`,
        subscriptionId: sub.id,
      });
      logged++;
      due = nextDue(sub.cadence, due);
    }
    if (due !== sub.nextDueDate) {
      await db
        .update(finSubscriptions)
        .set({ nextDueDate: due })
        .where(eq(finSubscriptions.id, sub.id));
    }
  }
  if (logged) bump();
  return { logged };
}

// ---------- savings goals ----------

export async function createSavingsGoal(input: {
  name: string;
  targetMinor: number;
  deadline?: string | null;
}) {
  const user = await requireUser();
  await db.insert(finSavingsGoals).values({
    id: randomUUID(),
    userId: user.id,
    name: input.name.trim().slice(0, 80),
    targetMinor: input.targetMinor,
    deadline: input.deadline ?? null,
  });
  bump();
}

export async function addToSavingsGoal(id: string, deltaMinor: number) {
  const user = await requireUser();
  const [g] = await db
    .select()
    .from(finSavingsGoals)
    .where(and(eq(finSavingsGoals.id, id), eq(finSavingsGoals.userId, user.id)));
  if (!g) return;
  await db
    .update(finSavingsGoals)
    .set({ savedMinor: Math.max(0, g.savedMinor + deltaMinor) })
    .where(eq(finSavingsGoals.id, id));
  bump();
}

export async function deleteSavingsGoal(id: string) {
  const user = await requireUser();
  await db
    .delete(finSavingsGoals)
    .where(and(eq(finSavingsGoals.id, id), eq(finSavingsGoals.userId, user.id)));
  bump();
}

// ---------- lent / borrowed ----------

export async function createLent(input: {
  person: string;
  direction: "lent" | "borrowed";
  amountMinor: number;
  date: string;
  note?: string;
}) {
  const user = await requireUser();
  await db.insert(finLent).values({
    id: randomUUID(),
    userId: user.id,
    person: input.person.trim().slice(0, 80),
    direction: input.direction,
    amountMinor: input.amountMinor,
    date: input.date,
    note: input.note ?? "",
  });
  bump();
}

export async function settleLent(id: string) {
  const user = await requireUser();
  await db
    .update(finLent)
    .set({ settled: true, settledAt: new Date() })
    .where(and(eq(finLent.id, id), eq(finLent.userId, user.id)));
  bump();
}

export async function deleteLent(id: string) {
  const user = await requireUser();
  await db
    .delete(finLent)
    .where(and(eq(finLent.id, id), eq(finLent.userId, user.id)));
  bump();
}

// ---------- rules ----------

export async function createRule(pattern: string, categoryId: string) {
  const user = await requireUser();
  await db.insert(finRules).values({
    id: randomUUID(),
    userId: user.id,
    pattern: pattern.trim().slice(0, 120),
    categoryId,
  });
  bump();
}

export async function deleteRule(id: string) {
  const user = await requireUser();
  await db
    .delete(finRules)
    .where(and(eq(finRules.id, id), eq(finRules.userId, user.id)));
  bump();
}
