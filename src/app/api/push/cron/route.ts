import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tasks, pushSubscriptions } from "@/db/schema";
import { sendPush } from "@/lib/push";

// Called every minute by Vercel Cron (or any external cron hitting GET /api/push/cron)
// Also callable manually; protected by CRON_SECRET env var.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Current time window: now → now+5min
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const hh = now.getUTCHours().toString().padStart(2, "0");
  const mm = now.getUTCMinutes().toString().padStart(2, "0");
  const currentTime = `${hh}:${mm}`;

  // 5-minute lookahead
  const ahead = new Date(now.getTime() + 5 * 60_000);
  const aheadHH = ahead.getUTCHours().toString().padStart(2, "0");
  const aheadMM = ahead.getUTCMinutes().toString().padStart(2, "0");
  const aheadTime = `${aheadHH}:${aheadMM}`;

  // Find tasks due today with dueTime in [currentTime, aheadTime] and not done
  const dueTasks = await db
    .select({ id: tasks.id, title: tasks.title, userId: tasks.userId, dueTime: tasks.dueTime })
    .from(tasks)
    .where(
      and(
        eq(tasks.dueDate, todayStr),
        eq(tasks.status, "todo"),
      )
    );

  const filtered = dueTasks.filter(
    (t) => t.dueTime && t.dueTime >= currentTime && t.dueTime <= aheadTime
  );

  if (!filtered.length) return NextResponse.json({ sent: 0 });

  const userIds = [...new Set(filtered.map((t) => t.userId))];
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));

  const subsByUser = new Map<string, typeof subs>();
  for (const s of subs) {
    const arr = subsByUser.get(s.userId) ?? [];
    arr.push(s);
    subsByUser.set(s.userId, arr);
  }

  let sent = 0;
  const stale: string[] = [];

  await Promise.allSettled(
    filtered.flatMap((task) =>
      (subsByUser.get(task.userId) ?? []).map(async (sub) => {
        try {
          await sendPush(sub, {
            title: "Task due soon",
            body: task.title,
            url: "/today",
          });
          sent++;
        } catch (err: unknown) {
          // 410 Gone = subscription expired; clean up
          if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
            stale.push(sub.id);
          }
        }
      })
    )
  );

  // Remove expired subscriptions
  if (stale.length) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, stale));
  }

  return NextResponse.json({ sent, stale: stale.length });
}
