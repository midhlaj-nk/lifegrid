"use server";

import { db } from "@/db";
import { dashboardPrefs } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface WidgetPref {
  key: string;
  enabled: boolean;
}

export async function saveDashboardPrefs(widgets: WidgetPref[]) {
  const user = await requireUser();
  const value = JSON.stringify(widgets);
  const [existing] = await db
    .select()
    .from(dashboardPrefs)
    .where(eq(dashboardPrefs.userId, user.id));
  if (existing) {
    await db
      .update(dashboardPrefs)
      .set({ widgets: value })
      .where(eq(dashboardPrefs.userId, user.id));
  } else {
    await db.insert(dashboardPrefs).values({ userId: user.id, widgets: value });
  }
  revalidatePath("/");
}
