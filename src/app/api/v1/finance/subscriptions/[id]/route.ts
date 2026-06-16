import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { finSubscriptions } from "@/db/schema";
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
      name,
      amountMinor,
      accountId,
      categoryId,
      cadence,
      nextDueDate,
      active,
      autoLog,
    } = body as {
      name?: string;
      amountMinor?: number;
      accountId?: string;
      categoryId?: string | null;
      cadence?: "weekly" | "monthly" | "yearly";
      nextDueDate?: string;
      active?: boolean;
      autoLog?: boolean;
    };

    const updates: Partial<typeof finSubscriptions.$inferInsert> = {};
    if (name !== undefined) updates.name = name.trim();
    if (amountMinor !== undefined) updates.amountMinor = amountMinor;
    if (accountId !== undefined) updates.accountId = accountId;
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (cadence !== undefined) updates.cadence = cadence;
    if (nextDueDate !== undefined) updates.nextDueDate = nextDueDate;
    if (active !== undefined) updates.active = active;
    if (autoLog !== undefined) updates.autoLog = autoLog;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await db
      .update(finSubscriptions)
      .set(updates)
      .where(and(eq(finSubscriptions.id, id), eq(finSubscriptions.userId, user.id)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[finance/subscriptions/:id PUT]", err);
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
      .delete(finSubscriptions)
      .where(and(eq(finSubscriptions.id, id), eq(finSubscriptions.userId, user.id)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[finance/subscriptions/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
