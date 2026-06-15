import { NextResponse, type NextRequest } from "next/server";
import { getUserIdForToken } from "@/lib/api-tokens";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserIdForToken(token);
  if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      icon: notes.icon,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt))
    .limit(10);

  return NextResponse.json({ notes: rows });
}
