import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
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

    const { searchParams } = new URL(req.url);
    const areaId = searchParams.get("areaId");

    const conditions = [
      eq(projects.userId, user.id),
      eq(projects.archived, false),
    ];
    if (areaId) {
      conditions.push(eq(projects.areaId, areaId));
    }

    const rows = await db
      .select({
        id: projects.id,
        areaId: projects.areaId,
        name: projects.name,
        color: projects.color,
        sortOrder: projects.sortOrder,
        archived: projects.archived,
        kanbanColumns: projects.kanbanColumns,
        cover: projects.cover,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(and(...conditions))
      .orderBy(asc(projects.sortOrder));

    return NextResponse.json({ projects: rows });
  } catch (err) {
    console.error("[projects GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, areaId, color, cover } = body as {
      name: string;
      areaId?: string;
      color?: string;
      cover?: string;
    };

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const id = randomUUID();

    await db.insert(projects).values({
      id,
      userId: user.id,
      name: name.trim(),
      ...(areaId !== undefined && { areaId }),
      ...(color !== undefined && { color }),
      ...(cover !== undefined && { cover }),
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[projects POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
