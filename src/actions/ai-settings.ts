"use server";

import { db } from "@/db";
import { aiSettings } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAiSettingsSafe() {
  const user = await requireUser();
  const [row] = await db
    .select()
    .from(aiSettings)
    .where(eq(aiSettings.userId, user.id));
  // keys never leave the server — only report presence
  return {
    hasGeminiKey: !!row?.geminiApiKey,
    hasOpenrouterKey: !!row?.openrouterApiKey,
    hasUnsplashKey: !!row?.unsplashAccessKey,
    chatModel: row?.chatModel ?? "gemini-2.5-flash",
    fastModel: row?.fastModel ?? "gemini-2.5-flash-lite",
    chatProvider: row?.chatProvider ?? "gemini",
    fastProvider: row?.fastProvider ?? "gemini",
  };
}

export async function saveAiSettings(input: {
  geminiApiKey?: string;
  openrouterApiKey?: string;
  unsplashAccessKey?: string;
  chatModel?: string;
  fastModel?: string;
  chatProvider?: "gemini" | "openrouter";
  fastProvider?: "gemini" | "openrouter";
}) {
  const user = await requireUser();
  const [existing] = await db
    .select()
    .from(aiSettings)
    .where(eq(aiSettings.userId, user.id));

  // empty string = leave unchanged; "CLEAR" = remove key
  const data: Record<string, string> = {};
  for (const k of ["geminiApiKey", "openrouterApiKey", "unsplashAccessKey"] as const) {
    const v = input[k];
    if (v === "CLEAR") data[k] = "";
    else if (v) data[k] = v;
  }
  for (const k of ["chatModel", "fastModel", "chatProvider", "fastProvider"] as const) {
    if (input[k]) data[k] = input[k]!;
  }

  if (existing) {
    await db
      .update(aiSettings)
      .set(data)
      .where(eq(aiSettings.userId, user.id));
  } else {
    await db.insert(aiSettings).values({ userId: user.id, ...data });
  }
  revalidatePath("/settings");
  return { ok: true };
}
