import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/worklog/server";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId)
    return NextResponse.json({ error: "GitHub not configured" }, { status: 500 });

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`;
  const state = user.id;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user&state=${state}`;

  return NextResponse.redirect(url);
}
