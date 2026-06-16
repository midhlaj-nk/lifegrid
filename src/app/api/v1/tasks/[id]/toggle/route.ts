import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { and, eq } from "drizzle-orm";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const [task] = await db
      .select({ id: tasks.id, status: tasks.status, completedAt: tasks.completedAt })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();
    let newStatus: "todo" | "doing" | "done";
    let newCompletedAt: Date | null;

    if (task.status === "done") {
      // Toggle back to todo
      newStatus = "todo";
      newCompletedAt = null;
    } else {
      // Mark as done
      newStatus = "done";
      newCompletedAt = now;
    }

    await db
      .update(tasks)
      .set({ status: newStatus, completedAt: newCompletedAt, updatedAt: now })
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

    return NextResponse.json({ status: newStatus, completedAt: newCompletedAt });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
