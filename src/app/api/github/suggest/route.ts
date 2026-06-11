import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { repoMappings } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/worklog/server";
import {
  getGithubContext,
  fetchCommitsAllBranches,
  GithubCommit,
} from "@/lib/worklog/github";
import { istDayUtcRange } from "@/lib/utils";

interface SuggestedEntry {
  repo: string;
  commitCount: number;
  hours: number;
  projectId: number | null;
  projectName: string;
  taskId: number | null;
  taskName: string;
  description: string;
  commits: string[];
  isPersonal: boolean;
}

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date)
    return NextResponse.json({ error: "date required" }, { status: 400 });

  const ctx = await getGithubContext(user.id);
  if (!ctx)
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  const { auth: ghAuth, headers } = ctx;

  const { startUtc, endUtc } = istDayUtcRange(date);

  const [reposRes, allMappings] = await Promise.all([
    fetch(
      `https://api.github.com/user/repos?sort=pushed&direction=desc&per_page=100`,
      { headers, cache: "no-store" }
    ),
    db.select().from(repoMappings).where(eq(repoMappings.userId, user.id)),
  ]);

  const reposData = reposRes.ok ? await reposRes.json() : [];
  // pushed_at moves forward on every push; if user committed on selected date,
  // any subsequent push keeps pushed_at >= startUtc. exact commit-date filter
  // happens in fetchCommitsAllBranches via startUtc/endUtc.
  const startMs = new Date(startUtc).getTime();
  const candidatePushedRepos = (Array.isArray(reposData) ? reposData : [])
    .filter(
      (r: { pushed_at?: string }) =>
        r.pushed_at && new Date(r.pushed_at).getTime() >= startMs
    )
    .map((r: { full_name: string }) => r.full_name);

  const reposToCheck = [
    ...new Set([
      ...candidatePushedRepos,
      ...allMappings.map((m) => m.repoFullName),
    ]),
  ];

  const byRepo = new Map<string, GithubCommit[]>();
  await Promise.all(
    reposToCheck.map(async (repo) => {
      const commits = await fetchCommitsAllBranches(
        repo,
        ghAuth.username,
        startUtc,
        endUtc,
        headers
      );
      if (commits.length) byRepo.set(repo, commits);
    })
  );

  if (byRepo.size === 0) return NextResponse.json({ suggestions: [] });

  const mapByRepo = new Map(allMappings.map((m) => [m.repoFullName, m]));

  const suggestions: SuggestedEntry[] = Array.from(byRepo.entries()).map(
    ([repo, items]) => {
      const m = mapByRepo.get(repo);
      return {
        repo,
        commitCount: items.length,
        hours: 8,
        projectId: m?.projectId ?? null,
        projectName: m?.projectName ?? "",
        taskId: m?.taskId ?? null,
        taskName: m?.taskName ?? "",
        description: items
          .map(
            (c) =>
              `- ${c.message
                .split("\n")
                .map((l, i) => (i === 0 ? l : `  ${l}`))
                .join("\n")}`
          )
          .join("\n\n"),
        commits: items.map((c) => c.message),
        isPersonal: false,
      };
    }
  );

  suggestions.sort((a, b) => {
    const am = a.projectId !== null;
    const bm = b.projectId !== null;
    if (am !== bm) return am ? -1 : 1;
    return b.commitCount - a.commitCount;
  });

  return NextResponse.json({ suggestions });
}
