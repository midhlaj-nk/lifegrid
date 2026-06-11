import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { format, subMonths } from "date-fns";
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

export type FinTx = typeof finTransactions.$inferSelect;
export type FinAccount = typeof finAccounts.$inferSelect;
export type FinCategory = typeof finCategories.$inferSelect;

export async function getAccountsWithBalances(userId: string) {
  const [accounts, txs] = await Promise.all([
    db
      .select()
      .from(finAccounts)
      .where(and(eq(finAccounts.userId, userId), eq(finAccounts.archived, false)))
      .orderBy(asc(finAccounts.createdAt)),
    db
      .select()
      .from(finTransactions)
      .where(eq(finTransactions.userId, userId)),
  ]);

  return accounts.map((a) => {
    let bal = a.openingBalanceMinor;
    for (const t of txs) {
      if (t.accountId === a.id) {
        if (t.type === "expense") bal -= t.amountMinor;
        else if (t.type === "income") bal += t.amountMinor;
        else if (t.type === "transfer") bal -= t.amountMinor;
      }
      if (t.type === "transfer" && t.transferToAccountId === a.id) {
        bal += t.amountMinor;
      }
    }
    return { ...a, balanceMinor: bal };
  });
}

export async function getCategories(userId: string) {
  return db
    .select()
    .from(finCategories)
    .where(eq(finCategories.userId, userId))
    .orderBy(asc(finCategories.name));
}

export async function getMonthTransactions(userId: string, month: string) {
  return db
    .select()
    .from(finTransactions)
    .where(
      and(
        eq(finTransactions.userId, userId),
        gte(finTransactions.date, `${month}-01`),
        lte(finTransactions.date, `${month}-31`)
      )
    )
    .orderBy(desc(finTransactions.date), desc(finTransactions.createdAt));
}

export async function getRecentTransactions(userId: string, limit = 50) {
  return db
    .select()
    .from(finTransactions)
    .where(eq(finTransactions.userId, userId))
    .orderBy(desc(finTransactions.date), desc(finTransactions.createdAt))
    .limit(limit);
}

export interface MonthSummary {
  month: string;
  incomeMinor: number;
  expenseMinor: number;
}

export async function getMonthlyTrend(
  userId: string,
  months = 6
): Promise<MonthSummary[]> {
  const startMonth = format(subMonths(new Date(), months - 1), "yyyy-MM");
  const txs = await db
    .select()
    .from(finTransactions)
    .where(
      and(
        eq(finTransactions.userId, userId),
        gte(finTransactions.date, `${startMonth}-01`)
      )
    );

  const byMonth = new Map<string, MonthSummary>();
  for (let i = months - 1; i >= 0; i--) {
    const m = format(subMonths(new Date(), i), "yyyy-MM");
    byMonth.set(m, { month: m, incomeMinor: 0, expenseMinor: 0 });
  }
  for (const t of txs) {
    const m = t.date.slice(0, 7);
    const row = byMonth.get(m);
    if (!row) continue;
    if (t.type === "income") row.incomeMinor += t.amountMinor;
    else if (t.type === "expense") row.expenseMinor += t.amountMinor;
  }
  return [...byMonth.values()];
}

export async function getBudgetsWithSpend(userId: string, month: string) {
  const [budgets, cats, txs] = await Promise.all([
    db.select().from(finBudgets).where(eq(finBudgets.userId, userId)),
    getCategories(userId),
    getMonthTransactions(userId, month),
  ]);
  return budgets
    .map((b) => {
      const cat = cats.find((c) => c.id === b.categoryId);
      const spent = txs
        .filter((t) => t.type === "expense" && t.categoryId === b.categoryId)
        .reduce((s, t) => s + t.amountMinor, 0);
      return cat
        ? {
            ...b,
            categoryName: cat.name,
            categoryIcon: cat.icon,
            spentMinor: spent,
          }
        : null;
    })
    .filter(Boolean) as Array<
    typeof finBudgets.$inferSelect & {
      categoryName: string;
      categoryIcon: string;
      spentMinor: number;
    }
  >;
}

export async function getSubscriptions(userId: string) {
  return db
    .select()
    .from(finSubscriptions)
    .where(eq(finSubscriptions.userId, userId))
    .orderBy(asc(finSubscriptions.nextDueDate));
}

export async function getSavingsGoals(userId: string) {
  return db
    .select()
    .from(finSavingsGoals)
    .where(eq(finSavingsGoals.userId, userId))
    .orderBy(asc(finSavingsGoals.createdAt));
}

export async function getLent(userId: string) {
  return db
    .select()
    .from(finLent)
    .where(eq(finLent.userId, userId))
    .orderBy(desc(finLent.date));
}

export async function getRules(userId: string) {
  return db.select().from(finRules).where(eq(finRules.userId, userId));
}
