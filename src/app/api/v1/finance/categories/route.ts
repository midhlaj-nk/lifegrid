import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { finCategories } from "@/db/schema";
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

    const categories = await db
      .select({
        id: finCategories.id,
        name: finCategories.name,
        icon: finCategories.icon,
        kind: finCategories.kind,
      })
      .from(finCategories)
      .where(eq(finCategories.userId, user.id))
      .orderBy(asc(finCategories.name));

    return NextResponse.json({ categories });
  } catch (err) {
    console.error("[finance/categories GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, icon, kind } = body as {
      name: string;
      icon?: string;
      kind: "expense" | "income";
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!["expense", "income"].includes(kind)) {
      return NextResponse.json({ error: "kind must be expense or income" }, { status: 400 });
    }

    const id = randomUUID();
    await db.insert(finCategories).values({
      id,
      userId: user.id,
      name: name.trim(),
      icon: icon ?? "💸",
      kind,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[finance/categories POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
