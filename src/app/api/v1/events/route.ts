import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { events } from "@/db/schema";
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

    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        date: events.date,
        yearlyRecurring: events.yearlyRecurring,
        color: events.color,
        icon: events.icon,
        note: events.note,
        createdAt: events.createdAt,
      })
      .from(events)
      .where(eq(events.userId, user.id))
      .orderBy(asc(events.date));

    return NextResponse.json({ events: rows });
  } catch (err) {
    console.error("[events GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, date, yearlyRecurring, color, icon, note } = body as {
      title: string;
      date: string;
      yearlyRecurring?: boolean;
      color?: string;
      icon?: string;
      note?: string;
    };

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!date || typeof date !== "string") {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const id = randomUUID();

    await db.insert(events).values({
      id,
      userId: user.id,
      title: title.trim(),
      date,
      ...(yearlyRecurring !== undefined && { yearlyRecurring }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
      ...(note !== undefined && { note }),
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[events POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
