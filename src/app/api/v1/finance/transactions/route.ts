import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { finTransactions } from "@/db/schema";
import { and, eq, desc, gte, lt, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type") as "expense" | "income" | "transfer" | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    const conditions = [eq(finTransactions.userId, user.id)];
    if (accountId) conditions.push(eq(finTransactions.accountId, accountId));
    if (categoryId) conditions.push(eq(finTransactions.categoryId, categoryId));
    if (type) conditions.push(eq(finTransactions.type, type));
    if (startDate) conditions.push(gte(finTransactions.date, startDate));
    if (endDate) conditions.push(lt(finTransactions.date, endDate));

    const transactions = await db
      .select({
        id: finTransactions.id,
        accountId: finTransactions.accountId,
        categoryId: finTransactions.categoryId,
        type: finTransactions.type,
        amountMinor: finTransactions.amountMinor,
        originalAmount: finTransactions.originalAmount,
        originalCurrency: finTransactions.originalCurrency,
        date: finTransactions.date,
        note: finTransactions.note,
        transferToAccountId: finTransactions.transferToAccountId,
        createdAt: finTransactions.createdAt,
      })
      .from(finTransactions)
      .where(and(...conditions))
      .orderBy(desc(finTransactions.date), desc(finTransactions.createdAt))
      .limit(limit);

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error("[finance/transactions GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      accountId,
      categoryId,
      type,
      amountMinor,
      date,
      note,
      originalAmount,
      originalCurrency,
      transferToAccountId,
    } = body as {
      accountId: string;
      categoryId?: string;
      type: "expense" | "income" | "transfer";
      amountMinor: number;
      date: string;
      note?: string;
      originalAmount?: string;
      originalCurrency?: string;
      transferToAccountId?: string;
    };

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }
    if (!["expense", "income", "transfer"].includes(type)) {
      return NextResponse.json({ error: "invalid type" }, { status: 400 });
    }
    if (amountMinor === undefined || amountMinor === null) {
      return NextResponse.json({ error: "amountMinor is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const id = randomUUID();
    await db.insert(finTransactions).values({
      id,
      userId: user.id,
      accountId,
      categoryId: categoryId ?? null,
      type,
      amountMinor,
      date,
      note: note ?? "",
      originalAmount: originalAmount ?? null,
      originalCurrency: originalCurrency ?? null,
      transferToAccountId: transferToAccountId ?? null,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[finance/transactions POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
