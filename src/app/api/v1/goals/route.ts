import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") ?? "active";

    const validStatuses = ["active", "achieved", "dropped", "all"] as const;
    type GoalStatus = "active" | "achieved" | "dropped";

    if (!validStatuses.includes(statusParam as (typeof validStatuses)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const conditions =
      statusParam === "all"
        ? [eq(goals.userId, user.id)]
        : [eq(goals.userId, user.id), eq(goals.status, statusParam as GoalStatus)];

    const rows = await db
      .select({
        id: goals.id,
        title: goals.title,
        description: goals.description,
        targetDate: goals.targetDate,
        manualProgress: goals.manualProgress,
        status: goals.status,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .where(and(...conditions))
      .orderBy(desc(goals.createdAt));

    return NextResponse.json({ goals: rows });
  } catch (err) {
    console.error("[goals GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, description, targetDate, manualProgress } = body as {
      title: string;
      description?: string;
      targetDate?: string;
      manualProgress?: number;
    };

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const id = randomUUID();

    await db.insert(goals).values({
      id,
      userId: user.id,
      title: title.trim(),
      ...(description !== undefined && { description }),
      ...(targetDate !== undefined && { targetDate }),
      ...(manualProgress !== undefined && { manualProgress }),
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[goals POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
