import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { finSubscriptions } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subscriptions = await db
      .select({
        id: finSubscriptions.id,
        name: finSubscriptions.name,
        amountMinor: finSubscriptions.amountMinor,
        accountId: finSubscriptions.accountId,
        categoryId: finSubscriptions.categoryId,
        cadence: finSubscriptions.cadence,
        nextDueDate: finSubscriptions.nextDueDate,
        active: finSubscriptions.active,
        autoLog: finSubscriptions.autoLog,
        createdAt: finSubscriptions.createdAt,
      })
      .from(finSubscriptions)
      .where(eq(finSubscriptions.userId, user.id))
      .orderBy(asc(finSubscriptions.nextDueDate));

    return NextResponse.json({ subscriptions });
  } catch (err) {
    console.error("[finance/subscriptions GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      name,
      amountMinor,
      accountId,
      categoryId,
      cadence,
      nextDueDate,
      autoLog,
    } = body as {
      name: string;
      amountMinor: number;
      accountId: string;
      categoryId?: string;
      cadence: "weekly" | "monthly" | "yearly";
      nextDueDate: string;
      autoLog?: boolean;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }
    if (!["weekly", "monthly", "yearly"].includes(cadence)) {
      return NextResponse.json({ error: "invalid cadence" }, { status: 400 });
    }
    if (!nextDueDate) {
      return NextResponse.json({ error: "nextDueDate is required" }, { status: 400 });
    }

    const id = randomUUID();
    await db.insert(finSubscriptions).values({
      id,
      userId: user.id,
      name: name.trim(),
      amountMinor,
      accountId,
      categoryId: categoryId ?? null,
      cadence,
      nextDueDate,
      autoLog: autoLog ?? true,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[finance/subscriptions POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
