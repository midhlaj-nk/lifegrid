import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sheets } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/worklog/server";

// sendBeacon target for last-moment sheet saves on tab close
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { id, data } = await request.json();
  if (!id || typeof data !== "string" || data.length > 8_000_000)
    return NextResponse.json({ error: "bad input" }, { status: 400 });

  await db
    .update(sheets)
    .set({ data, updatedAt: new Date() })
    .where(and(eq(sheets.id, id), eq(sheets.userId, user.id)));
  return NextResponse.json({ ok: true });
}
