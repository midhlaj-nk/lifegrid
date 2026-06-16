import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { habits, habitChecks } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { format } from "date-fns";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = format(new Date(), "yyyy-MM-dd");

    const rows = await db
      .select({
        id: habits.id,
        name: habits.name,
        icon: habits.icon,
        color: habits.color,
        weekdays: habits.weekdays,
        createdAt: habits.createdAt,
      })
      .from(habits)
      .where(eq(habits.userId, user.id))
      .orderBy(asc(habits.createdAt));

    const todayChecks = await db
      .select({ habitId: habitChecks.habitId })
      .from(habitChecks)
      .where(eq(habitChecks.date, today));

    const checkedSet = new Set(todayChecks.map((c) => c.habitId));

    const result = rows.map((h) => ({
      ...h,
      checkedToday: checkedSet.has(h.id),
    }));

    return NextResponse.json({ habits: result });
  } catch (err) {
    console.error("[habits GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, icon, color, weekdays } = body as {
      name: string;
      icon?: string;
      color?: string;
      weekdays?: number[];
    };

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const id = randomUUID();

    await db.insert(habits).values({
      id,
      userId: user.id,
      name: name.trim(),
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color }),
      weekdays: weekdays !== undefined ? JSON.stringify(weekdays) : JSON.stringify([]),
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[habits POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
