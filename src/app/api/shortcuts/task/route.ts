import { NextResponse, type NextRequest } from "next/server";
import { getUserIdForToken } from "@/lib/api-tokens";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserIdForToken(token);
  if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = await req.json();
  const title = (body.title as string | undefined)?.trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const id = randomUUID();
  await db.insert(tasks).values({
    id,
    userId,
    title,
    dueDate: body.dueDate ?? null,
    note: body.note ?? "",
    priority: body.priority ?? 4,
    status: "todo",
    sortOrder: 0,
  });

  return NextResponse.json({ id, title });
}
