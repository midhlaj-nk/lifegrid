import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, notes } from "@/db/schema";
import { and, eq, like, or } from "drizzle-orm";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.trim() === "") {
      return NextResponse.json({ tasks: [], notes: [] });
    }

    const pattern = `%${q}%`;

    const [matchedTasks, matchedNotes] = await Promise.all([
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          dueDate: tasks.dueDate,
          priority: tasks.priority,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, user.id), like(tasks.title, pattern)))
        .limit(20),

      db
        .select({
          id: notes.id,
          title: notes.title,
          icon: notes.icon,
        })
        .from(notes)
        .where(and(eq(notes.userId, user.id), like(notes.title, pattern)))
        .limit(20),
    ]);

    return NextResponse.json({ tasks: matchedTasks, notes: matchedNotes });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
