import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { finTransactions, finCategories } from "@/db/schema";
import { and, eq, gte, lt } from "drizzle-orm";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    // Default to current month (today is 2026-06-16)
    const monthParam = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    // Parse YYYY-MM
    const [yearStr, monthStr] = monthParam.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month format, expected YYYY-MM" }, { status: 400 });
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    // Compute next month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    // Fetch all relevant transactions for the month
    const transactions = await db
      .select({
        id: finTransactions.id,
        type: finTransactions.type,
        amountMinor: finTransactions.amountMinor,
        categoryId: finTransactions.categoryId,
      })
      .from(finTransactions)
      .where(
        and(
          eq(finTransactions.userId, user.id),
          gte(finTransactions.date, startDate),
          lt(finTransactions.date, endDate)
        )
      );

    // Compute totals
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategoryId: Record<string, number> = {};

    for (const tx of transactions) {
      if (tx.type === "income") {
        totalIncome += tx.amountMinor;
      } else if (tx.type === "expense") {
        totalExpense += tx.amountMinor;
        if (tx.categoryId) {
          expenseByCategoryId[tx.categoryId] =
            (expenseByCategoryId[tx.categoryId] ?? 0) + tx.amountMinor;
        }
      }
    }

    // Fetch category details for expense categories found
    const categoryIds = Object.keys(expenseByCategoryId);
    let byCategory: {
      categoryId: string;
      categoryName: string;
      categoryIcon: string;
      total: number;
    }[] = [];

    if (categoryIds.length > 0) {
      const categories = await db
        .select({
          id: finCategories.id,
          name: finCategories.name,
          icon: finCategories.icon,
        })
        .from(finCategories)
        .where(eq(finCategories.userId, user.id));

      const categoryMap = new Map(categories.map((c) => [c.id, c]));

      byCategory = categoryIds
        .map((catId) => {
          const cat = categoryMap.get(catId);
          return {
            categoryId: catId,
            categoryName: cat?.name ?? "Unknown",
            categoryIcon: cat?.icon ?? "💸",
            total: expenseByCategoryId[catId],
          };
        })
        .sort((a, b) => b.total - a.total);
    }

    return NextResponse.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      byCategory,
    });
  } catch (err) {
    console.error("[finance/summary GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
