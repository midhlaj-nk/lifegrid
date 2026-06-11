import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/worklog/server";
import { getGithubContext } from "@/lib/worklog/github";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const ctx = await getGithubContext(user.id);
  if (!ctx)
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  const { headers } = ctx;

  const res = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    { headers }
  );
  if (!res.ok)
    return NextResponse.json({ error: "GitHub API error" }, { status: 502 });

  const data = await res.json();
  if (!Array.isArray(data)) return NextResponse.json([]);

  return NextResponse.json(
    data.map(
      (r: {
        full_name: string;
        description: string | null;
        private: boolean;
        updated_at: string;
      }) => ({
        fullName: r.full_name,
        description: r.description,
        private: r.private,
        updatedAt: r.updated_at,
      })
    )
  );
}
