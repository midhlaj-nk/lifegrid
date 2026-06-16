import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { habits, habitChecks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const today = format(new Date(), "yyyy-MM-dd");

    // Verify habit belongs to user
    const habit = await db
      .select({ id: habits.id })
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, user.id)));

    if (habit.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existing = await db
      .select()
      .from(habitChecks)
      .where(and(eq(habitChecks.habitId, id), eq(habitChecks.date, today)));

    if (existing.length > 0) {
      await db
        .delete(habitChecks)
        .where(and(eq(habitChecks.habitId, id), eq(habitChecks.date, today)));
      return NextResponse.json({ checked: false });
    } else {
      await db.insert(habitChecks).values({ habitId: id, date: today });
      return NextResponse.json({ checked: true });
    }
  } catch (err) {
    console.error("[habits/:id/check POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
