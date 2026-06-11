import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/worklog/server";
import { aiComplete } from "@/lib/worklog/ai";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const {
    prompt,
    aiProvider,
    openrouterApiKey,
    openrouterModel,
    geminiApiKey,
    geminiModel,
  } = await request.json();
  if (!prompt?.trim())
    return NextResponse.json({ error: "No prompt" }, { status: 400 });

  try {
    const text = await aiComplete(
      prompt.trim(),
      {
        provider: aiProvider || "openrouter",
        openrouterApiKey: openrouterApiKey || undefined,
        openrouterModel: openrouterModel || undefined,
        geminiApiKey: geminiApiKey || undefined,
        geminiModel: geminiModel || undefined,
      },
      "ai/test"
    );
    return NextResponse.json({ response: text });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
