import { NextResponse } from "next/server";
import {
  getApiUser,
  unauthorized,
  getWorklogSettings,
} from "@/lib/worklog/server";
import { buildStyleBlock } from "@/lib/utils";
import {
  aiComplete,
  aiConfigFromSettings,
  type AiConfig,
} from "@/lib/worklog/ai";

interface RawRow {
  date: string;
  projectName: string;
  taskName: string;
  status: string;
  description: string;
}

interface GroupedEntry {
  projectName: string;
  taskName: string;
  status: string;
  description: string;
  perDay: Array<{ date: string; status: string; description: string }>;
}

async function aiSummarize(prompt: string, config: AiConfig): Promise<string> {
  try {
    return await aiComplete(prompt, config, "weekly/concise");
  } catch (e) {
    console.error("[weekly/concise] AI ERROR:", (e as Error).message);
    return "";
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { rows }: { rows: RawRow[] } = await request.json();
  if (!rows?.length)
    return NextResponse.json({ error: "No rows" }, { status: 400 });

  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));

  const groups = new Map<string, GroupedEntry>();
  for (const r of sorted) {
    const key = `${r.projectName}::${r.taskName}`;
    if (!groups.has(key)) {
      groups.set(key, {
        projectName: r.projectName,
        taskName: r.taskName,
        status: r.status,
        description: "",
        perDay: [],
      });
    }
    const g = groups.get(key)!;
    g.perDay.push({ date: r.date, status: r.status, description: r.description });
    g.status = r.status;
  }

  const settings = await getWorklogSettings(user.id);
  const styleBlock = buildStyleBlock(settings?.descriptionStyle);
  const aiConfig = aiConfigFromSettings(settings ?? null);

  const grouped = Array.from(groups.values());
  const summarized = await Promise.all(
    grouped.map(async (g) => {
      if (g.perDay.length === 1)
        return { ...g, description: g.perDay[0].description };
      const daily = g.perDay
        .map((d) => `- [${d.date}, ${d.status}] ${d.description}`)
        .join("\n");
      const prompt = `Combine multiple daily work log entries for the same task into a single weekly summary paragraph.

Project: ${g.projectName}
Task: ${g.taskName}
Final status: ${g.status}

Daily entries this week:
${daily}${styleBlock}

Rules:
- Functional overview, not narrative. Describe WHAT was improved/fixed/built across the week.
- BANNED: "I", "me", "we", "our", "today", "spent the day", "this week".
- BANNED: backticks, file paths, function names, API routes.
- Start with a past-tense action verb: "Cleaned up", "Refined", "Strengthened", "Polished".
- Long comma-spliced sentences. Parenthetical asides for the WHY.
- "Also fixed…" / "Also polished…" to chain.
- Output ONLY the description paragraph(s). No preamble.`;
      const summary = await aiSummarize(prompt, aiConfig);
      return {
        ...g,
        description:
          summary || g.perDay.map((d) => d.description).join(" "),
      };
    })
  );

  return NextResponse.json({ entries: summarized });
}
