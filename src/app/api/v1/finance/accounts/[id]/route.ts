import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { finAccounts } from "@/db/schema";
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
    const { name, type, openingBalanceMinor, color, archived } = body as {
      name?: string;
      type?: "bank" | "cash" | "card" | "upi";
      openingBalanceMinor?: number;
      color?: string;
      archived?: boolean;
    };

    const updates: Partial<typeof finAccounts.$inferInsert> = {};
    if (name !== undefined) updates.name = name.trim();
    if (type !== undefined) updates.type = type;
    if (openingBalanceMinor !== undefined) updates.openingBalanceMinor = openingBalanceMinor;
    if (color !== undefined) updates.color = color;
    if (archived !== undefined) updates.archived = archived;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const result = await db
      .update(finAccounts)
      .set(updates)
      .where(and(eq(finAccounts.id, id), eq(finAccounts.userId, user.id)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[finance/accounts/:id PUT]", err);
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
      .delete(finAccounts)
      .where(and(eq(finAccounts.id, id), eq(finAccounts.userId, user.id)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[finance/accounts/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
