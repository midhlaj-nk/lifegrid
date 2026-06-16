import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tags } from "@/db/schema";
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
        id: tags.id,
        name: tags.name,
        color: tags.color,
        createdAt: tags.createdAt,
      })
      .from(tags)
      .where(eq(tags.userId, user.id))
      .orderBy(asc(tags.name));

    return NextResponse.json({ tags: rows });
  } catch (err) {
    console.error("[tags GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, color } = body as { name: string; color?: string };

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const id = randomUUID();

    await db.insert(tags).values({
      id,
      userId: user.id,
      name: name.trim(),
      ...(color !== undefined && { color }),
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[tags POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
