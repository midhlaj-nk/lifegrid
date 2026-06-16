import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { goals } from "@/db/schema";
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
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, user.id)));

    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, targetDate, manualProgress, status } = body as {
      title?: string;
      description?: string;
      targetDate?: string | null;
      manualProgress?: number;
      status?: "active" | "achieved" | "dropped";
    };

    const updates: Partial<{
      title: string;
      description: string;
      targetDate: string | null;
      manualProgress: number;
      status: "active" | "achieved" | "dropped";
    }> = {};

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (targetDate !== undefined) updates.targetDate = targetDate;
    if (manualProgress !== undefined) updates.manualProgress = manualProgress;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await db.update(goals).set(updates).where(and(eq(goals.id, id), eq(goals.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[goals/:id PUT]", err);
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
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, user.id)));

    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[goals/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
