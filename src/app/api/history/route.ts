import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { worklogSubmissions } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/worklog/server";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const submissions = await db
    .select()
    .from(worklogSubmissions)
    .where(eq(worklogSubmissions.userId, user.id))
    .orderBy(desc(worklogSubmissions.createdAt))
    .limit(30);

  return NextResponse.json(
    submissions.map((s) => ({
      ...s,
      entries: JSON.parse(s.entries),
    }))
  );
}
