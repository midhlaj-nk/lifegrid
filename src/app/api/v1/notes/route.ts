import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";
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
    const parentIdParam = searchParams.get("parentId");

    const rows = await db
      .select({
        id: notes.id,
        parentId: notes.parentId,
        title: notes.title,
        icon: notes.icon,
        cover: notes.cover,
        mode: notes.mode,
        sortOrder: notes.sortOrder,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(
        parentIdParam === "root" || parentIdParam === null
          ? and(eq(notes.userId, user.id), isNull(notes.parentId))
          : and(eq(notes.userId, user.id), eq(notes.parentId, parentIdParam))
      )
      .orderBy(desc(notes.sortOrder));

    return NextResponse.json({ notes: rows });
  } catch (err) {
    console.error("[GET /api/v1/notes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { title, parentId, icon, cover, mode } = body as {
      title?: string;
      parentId?: string;
      icon?: string;
      cover?: string;
      mode?: "page" | "canvas";
    };

    const id = randomUUID();
    const now = new Date();

    await db.insert(notes).values({
      id,
      userId: user.id,
      parentId: parentId ?? null,
      title: title ?? "Untitled",
      icon: icon ?? "📄",
      cover: cover ?? "",
      mode: mode ?? "page",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/notes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
