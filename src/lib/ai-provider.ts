import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { eq } from "drizzle-orm";
import type { LanguageModel } from "ai";
import { db } from "@/db";
import { aiSettings } from "@/db/schema";

export type AiTier = "chat" | "fast";

export async function getAiSettings(userId: string) {
  const [row] = await db
    .select()
    .from(aiSettings)
    .where(eq(aiSettings.userId, userId));
  return row ?? null;
}

/**
 * Resolve a LanguageModel for the user's configured provider + tier.
 * Throws a friendly error when no key is configured.
 *
 * NOTE: vault data must NEVER be passed to any model built here.
 */
export async function getModel(
  userId: string,
  tier: AiTier
): Promise<LanguageModel> {
  const s = await getAiSettings(userId);
  const provider = tier === "chat" ? s?.chatProvider : s?.fastProvider;
  const modelId =
    tier === "chat"
      ? (s?.chatModel ?? "gemini-2.5-flash")
      : (s?.fastModel ?? "gemini-2.5-flash-lite");

  if (provider === "openrouter") {
    const key = s?.openrouterApiKey || process.env.OPENROUTER_API_KEY;
    if (!key)
      throw new Error("OpenRouter API key not set — add it in Settings → AI");
    return createOpenRouter({ apiKey: key }).chat(modelId);
  }

  const key = s?.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key not set — add it in Settings → AI");
  return createGoogleGenerativeAI({ apiKey: key })(modelId);
}
