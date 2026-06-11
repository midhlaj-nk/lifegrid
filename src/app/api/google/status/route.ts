import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { googleAuth } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/worklog/server";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ connected: false });

  const [row] = await db
    .select({ email: googleAuth.email, refreshToken: googleAuth.refreshToken })
    .from(googleAuth)
    .where(eq(googleAuth.userId, user.id));

  return NextResponse.json({
    connected: !!row,
    email: row?.email || null,
    hasRefreshToken: !!row?.refreshToken,
  });
}

export async function DELETE() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  await db.delete(googleAuth).where(eq(googleAuth.userId, user.id));
  return NextResponse.json({ ok: true });
}
