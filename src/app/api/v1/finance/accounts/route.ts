import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { finAccounts } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await db
      .select({
        id: finAccounts.id,
        name: finAccounts.name,
        type: finAccounts.type,
        openingBalanceMinor: finAccounts.openingBalanceMinor,
        color: finAccounts.color,
        archived: finAccounts.archived,
        createdAt: finAccounts.createdAt,
      })
      .from(finAccounts)
      .where(eq(finAccounts.userId, user.id))
      .orderBy(asc(finAccounts.archived), asc(finAccounts.createdAt));

    return NextResponse.json({ accounts });
  } catch (err) {
    console.error("[finance/accounts GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, type, openingBalanceMinor, color } = body as {
      name: string;
      type: "bank" | "cash" | "card" | "upi";
      openingBalanceMinor?: number;
      color?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!["bank", "cash", "card", "upi"].includes(type)) {
      return NextResponse.json({ error: "invalid type" }, { status: 400 });
    }

    const id = randomUUID();
    await db.insert(finAccounts).values({
      id,
      userId: user.id,
      name: name.trim(),
      type,
      openingBalanceMinor: openingBalanceMinor ?? 0,
      color: color ?? "#6366f1",
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[finance/accounts POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
