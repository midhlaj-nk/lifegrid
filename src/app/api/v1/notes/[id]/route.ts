import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { and, eq } from "drizzle-orm";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
      .limit(1);

    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(note);
  } catch (err) {
    console.error("[GET /api/v1/notes/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const {
      title,
      icon,
      cover,
      content,
      canvas,
      mode,
      sortOrder,
    } = body as {
      title?: string;
      icon?: string;
      cover?: string;
      content?: string;
      canvas?: string;
      mode?: "page" | "canvas";
      sortOrder?: number;
    };

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) patch.title = title;
    if (icon !== undefined) patch.icon = icon;
    if (cover !== undefined) patch.cover = cover;
    if (content !== undefined) patch.content = content;
    if (canvas !== undefined) patch.canvas = canvas;
    if (mode !== undefined) patch.mode = mode;
    if (sortOrder !== undefined) patch.sortOrder = sortOrder;

    await db
      .update(notes)
      .set(patch)
      .where(and(eq(notes.id, id), eq(notes.userId, user.id)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/v1/notes/[id]]", err);
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

    // Delete children first (parentId is not a real FK, so no cascade)
    await db
      .delete(notes)
      .where(and(eq(notes.parentId, id), eq(notes.userId, user.id)));

    // Delete the note itself
    await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, user.id)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/v1/notes/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
