"use server";

import { db } from "@/db";
import { appConfig, user } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const SINGLETON = "singleton";

/** Read the singleton app config, creating it (signups off) on first access. */
export async function getAppConfig() {
  const [row] = await db
    .select()
    .from(appConfig)
    .where(eq(appConfig.id, SINGLETON));
  if (row) return row;
  const [created] = await db
    .insert(appConfig)
    .values({ id: SINGLETON, allowSignups: false })
    .returning();
  return created;
}

/** Resolve the first registered user — they are the permanent super-admin. */
async function requireSuperAdmin() {
  const caller = await requireUser();
  const [first] = await db
    .select({ id: user.id })
    .from(user)
    .orderBy(asc(user.createdAt))
    .limit(1);
  if (!first || first.id !== caller.id) {
    throw new Error("Forbidden: super-admin only");
  }
  return caller;
}

/** Super-admin toggle for whether new accounts may register. */
export async function setAllowSignups(value: boolean) {
  await requireSuperAdmin();
  await db
    .insert(appConfig)
    .values({ id: SINGLETON, allowSignups: value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appConfig.id,
      set: { allowSignups: value, updatedAt: new Date() },
    });
  revalidatePath("/", "layout");
}

/** Read-only helper for the auth hook (no auth requirement — runs pre-session). */
export async function signupsAllowed(): Promise<boolean> {
  const [row] = await db
    .select({ allow: appConfig.allowSignups })
    .from(appConfig)
    .where(eq(appConfig.id, SINGLETON));
  return row?.allow ?? false;
}
