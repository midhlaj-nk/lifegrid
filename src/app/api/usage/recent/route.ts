import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { worklogSubmissions } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/worklog/server";

interface SubEntry {
  projectId?: number;
  projectName?: string;
  taskId?: number;
  taskName?: string;
}

interface RecentTask {
  projectId: number;
  projectName: string;
  taskId: number;
  taskName: string;
}

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const subs = await db
    .select({ entries: worklogSubmissions.entries })
    .from(worklogSubmissions)
    .where(eq(worklogSubmissions.userId, user.id))
    .orderBy(desc(worklogSubmissions.createdAt))
    .limit(30);

  const projectCount = new Map<number, number>();
  const taskInfo = new Map<string, RecentTask & { count: number }>();

  for (const sub of subs) {
    try {
      const items = JSON.parse(sub.entries) as SubEntry[];
      for (const it of items) {
        if (!it.projectId) continue;
        projectCount.set(it.projectId, (projectCount.get(it.projectId) || 0) + 1);
        if (!it.taskId) continue;
        const key = `${it.projectId}:${it.taskId}`;
        const existing = taskInfo.get(key);
        if (existing) existing.count++;
        else if (it.taskName && it.projectName) {
          taskInfo.set(key, {
            projectId: it.projectId,
            projectName: it.projectName,
            taskId: it.taskId,
            taskName: it.taskName,
            count: 1,
          });
        }
      }
    } catch {
      /* skip */
    }
  }

  const recentProjects = Array.from(projectCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const recentTasks: RecentTask[] = Array.from(taskInfo.values())
    .sort((a, b) => b.count - a.count)
    .map(({ count: _c, ...rest }) => rest);

  return NextResponse.json({ recentProjects, recentTasks });
}
