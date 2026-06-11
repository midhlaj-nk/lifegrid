import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { githubAuth } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/worklog/server";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ connected: false });

  const [auth] = await db
    .select({ username: githubAuth.username })
    .from(githubAuth)
    .where(eq(githubAuth.userId, user.id));

  return NextResponse.json({
    connected: !!auth,
    username: auth?.username || null,
  });
}

export async function DELETE() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  await db.delete(githubAuth).where(eq(githubAuth.userId, user.id));
  return NextResponse.json({ ok: true });
}
