import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { events } from "@/db/schema";
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

    const existing = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, id), eq(events.userId, user.id)));

    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, date, yearlyRecurring, color, icon, note } = body as {
      title?: string;
      date?: string;
      yearlyRecurring?: boolean;
      color?: string;
      icon?: string;
      note?: string;
    };

    const updates: Partial<{
      title: string;
      date: string;
      yearlyRecurring: boolean;
      color: string;
      icon: string;
      note: string;
    }> = {};

    if (title !== undefined) updates.title = title.trim();
    if (date !== undefined) updates.date = date;
    if (yearlyRecurring !== undefined) updates.yearlyRecurring = yearlyRecurring;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    if (note !== undefined) updates.note = note;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await db.update(events).set(updates).where(and(eq(events.id, id), eq(events.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[events/:id PUT]", err);
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

    const existing = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, id), eq(events.userId, user.id)));

    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(events).where(and(eq(events.id, id), eq(events.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[events/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
