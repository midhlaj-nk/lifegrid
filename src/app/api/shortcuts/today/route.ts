import { NextResponse, type NextRequest } from "next/server";
import { getUserIdForToken } from "@/lib/api-tokens";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserIdForToken(token);
  if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const today = format(new Date(), "yyyy-MM-dd");
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      status: tasks.status,
    })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), ne(tasks.status, "done"), eq(tasks.dueDate, today)));

  return NextResponse.json({ tasks: rows, date: today });
}
