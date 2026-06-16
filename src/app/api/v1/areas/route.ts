import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { areas } from "@/db/schema";
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

    const rows = await db
      .select({
        id: areas.id,
        name: areas.name,
        color: areas.color,
        icon: areas.icon,
        cover: areas.cover,
        sortOrder: areas.sortOrder,
        createdAt: areas.createdAt,
      })
      .from(areas)
      .where(eq(areas.userId, user.id))
      .orderBy(asc(areas.sortOrder), asc(areas.createdAt));

    return NextResponse.json({ areas: rows });
  } catch (err) {
    console.error("[areas GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, color, icon, cover } = body as {
      name: string;
      color?: string;
      icon?: string;
      cover?: string;
    };

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const id = randomUUID();

    await db.insert(areas).values({
      id,
      userId: user.id,
      name: name.trim(),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
      ...(cover !== undefined && { cover }),
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[areas POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
