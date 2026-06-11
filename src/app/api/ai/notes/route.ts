import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/worklog/server";
import { getModel } from "@/lib/ai-provider";

const COMMANDS: Record<string, string> = {
  summarize: "Summarize the following note concisely as bullet points.",
  improve:
    "Rewrite the following text with better clarity and flow. Keep the meaning and approximate length.",
  continue:
    "Continue writing from where this text ends, matching its tone and topic. Output only the continuation.",
  grammar:
    "Fix grammar, spelling and punctuation in the following text. Output only the corrected text, change nothing else.",
  translate:
    "Translate the following text to {{lang}}. Output only the translation.",
};

export async function POST(req: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { command, text, lang } = await req.json();
  const template = COMMANDS[command];
  if (!template || !text?.trim())
    return NextResponse.json(
      { error: "command and text required" },
      { status: 400 }
    );

  let model;
  try {
    model = await getModel(user.id, "chat");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const instruction = template.replace("{{lang}}", lang || "English");
  const { text: out } = await generateText({
    model,
    prompt: `${instruction}\n\n"""\n${text.slice(0, 20000)}\n"""`,
  });

  return NextResponse.json({ result: out.trim() });
}
