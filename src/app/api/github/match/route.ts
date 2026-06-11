import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { repoMappings } from "@/db/schema";
import {
  getApiUser,
  unauthorized,
  getWorklogSettings,
} from "@/lib/worklog/server";
import { buildStyleBlock, istDayUtcRange } from "@/lib/utils";
import {
  aiComplete,
  aiConfigFromSettings,
  type AiConfig,
} from "@/lib/worklog/ai";
import {
  getGithubContext,
  fetchCommitsAllBranches,
} from "@/lib/worklog/github";

async function aiPick(
  prompt: string,
  label: string,
  config: AiConfig
): Promise<string> {
  try {
    return await aiComplete(prompt, config, `github/match/${label}`);
  } catch (e) {
    console.error(`[github/match][${label}] ERROR:`, (e as Error).message);
    return "";
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { repo, date, hours } = await request.json();
  if (!repo || !date)
    return NextResponse.json(
      { error: "repo and date required" },
      { status: 400 }
    );

  const [ctx, settings] = await Promise.all([
    getGithubContext(user.id),
    getWorklogSettings(user.id),
  ]);
  if (!ctx)
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  const { auth: ghAuth, headers } = ctx;

  const aiConfig = aiConfigFromSettings(settings ?? null);

  const { startUtc, endUtc } = istDayUtcRange(date);
  const [commits, [mapping]] = await Promise.all([
    fetchCommitsAllBranches(repo, ghAuth.username, startUtc, endUtc, headers),
    db
      .select()
      .from(repoMappings)
      .where(
        and(eq(repoMappings.userId, user.id), eq(repoMappings.repoFullName, repo))
      ),
  ]);

  const commitsText = commits
    .map((c) => `Commit ${c.sha.slice(0, 7)}:\n${c.message.trim()}`)
    .join("\n\n---\n\n");

  const projectId: number | null = mapping?.projectId ?? null;
  const projectName = mapping?.projectName ?? "";
  const taskId: number | null = mapping?.taskId ?? null;
  const taskName = mapping?.taskName ?? "";
  const isPersonal = false;

  const styleBlock = buildStyleBlock(settings?.descriptionStyle);

  const descPrompt = `Summarize the functional outcomes of the day's work as a polished changelog paragraph.

Repo: ${repo}
Hours: ${hours || "unspecified"}
Commits:
${commitsText}${styleBlock}

Hard rules:
- Functional overview, not a narrative. Describe WHAT was improved, fixed, polished, cleaned up — NOT who did it or how their day went.
- BANNED: "I", "me", "my", "we", "our", "today", "spent the day", "worked on", "in this update", "this PR".
- BANNED: backticks, file paths, function names (e.g. \`localTimeOfDay\`), API routes, env vars.
- Start with a past-tense action verb: "Cleaned up", "Refined", "Fixed", "Reworked", "Strengthened", "Polished".
- Group related fixes into long sentences with commas and "and". Use parenthetical asides for the WHY.
- Use "Also fixed…" / "Also polished…" to chain follow-up sentences.
- Reference UI labels in straight quotes ("Total"), not backticks.
- Output ONLY the description paragraph(s). No preamble like "Here is…". No bullets.`;
  const description =
    (await aiPick(descPrompt, "description-from-commits", aiConfig)).trim() ||
    commitsText;

  return NextResponse.json({
    repo,
    commitCount: commits.length,
    projectId,
    projectName,
    taskId,
    taskName,
    isPersonal,
    description,
  });
}
