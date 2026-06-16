import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { finTransactions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
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
      accountId?: string;
      categoryId?: string | null;
      type?: "expense" | "income" | "transfer";
      amountMinor?: number;
      date?: string;
      note?: string;
      originalAmount?: string | null;
      originalCurrency?: string | null;
      transferToAccountId?: string | null;
    };

    const updates: Partial<typeof finTransactions.$inferInsert> = {};
    if (accountId !== undefined) updates.accountId = accountId;
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (type !== undefined) updates.type = type;
    if (amountMinor !== undefined) updates.amountMinor = amountMinor;
    if (date !== undefined) updates.date = date;
    if (note !== undefined) updates.note = note;
    if (originalAmount !== undefined) updates.originalAmount = originalAmount;
    if (originalCurrency !== undefined) updates.originalCurrency = originalCurrency;
    if (transferToAccountId !== undefined) updates.transferToAccountId = transferToAccountId;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await db
      .update(finTransactions)
      .set(updates)
      .where(and(eq(finTransactions.id, id), eq(finTransactions.userId, user.id)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[finance/transactions/:id PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    await db
      .delete(finTransactions)
      .where(and(eq(finTransactions.id, id), eq(finTransactions.userId, user.id)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[finance/transactions/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
