import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { googleAuth, worklogSettings } from "@/db/schema";

/** Session user for worklog route handlers; null → caller returns 401. */
export async function getApiUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export type WorklogSettings = typeof worklogSettings.$inferSelect;

export async function getWorklogSettings(
  userId: string
): Promise<WorklogSettings | null> {
  const [row] = await db
    .select()
    .from(worklogSettings)
    .where(eq(worklogSettings.userId, userId));
  return row ?? null;
}

export async function upsertWorklogSettings(
  userId: string,
  data: Partial<Omit<WorklogSettings, "id" | "userId">>
) {
  const existing = await getWorklogSettings(userId);
  if (existing) {
    await db
      .update(worklogSettings)
      .set(data)
      .where(eq(worklogSettings.userId, userId));
  } else {
    await db.insert(worklogSettings).values({
      id: randomUUID(),
      userId,
      ...data,
    });
  }
}

// ---------- Google (Gmail send) tokens ----------

export async function getGoogleAuth(userId: string) {
  const [row] = await db
    .select()
    .from(googleAuth)
    .where(eq(googleAuth.userId, userId));
  return row ?? null;
}

export async function saveGoogleTokens(
  userId: string,
  tokens: {
    email?: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date | null;
  }
) {
  const existing = await getGoogleAuth(userId);
  if (existing) {
    await db
      .update(googleAuth)
      .set({
        accessToken: tokens.accessToken,
        ...(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
        ...(tokens.email ? { email: tokens.email } : {}),
        expiresAt: tokens.expiresAt ?? existing.expiresAt,
      })
      .where(eq(googleAuth.userId, userId));
  } else {
    await db.insert(googleAuth).values({
      id: randomUUID(),
      userId,
      email: tokens.email ?? "",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? "",
      expiresAt: tokens.expiresAt ?? null,
    });
  }
}
