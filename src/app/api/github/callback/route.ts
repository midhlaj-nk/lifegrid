import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { githubAuth } from "@/db/schema";
import { getApiUser } from "@/lib/worklog/server";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.redirect(new URL("/", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || state !== user.id) {
    return NextResponse.redirect(new URL("/worklog?github=error", request.url));
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return NextResponse.redirect(new URL("/worklog?github=error", request.url));
  }

  const ghHeaders = { Authorization: `Bearer ${tokenData.access_token}` };
  const [userRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", { headers: ghHeaders }),
    fetch("https://api.github.com/user/emails", { headers: ghHeaders }),
  ]);
  const userData = await userRes.json();
  const emailsData = emailsRes.ok ? await emailsRes.json() : [];
  if (!userData.login) {
    return NextResponse.redirect(new URL("/worklog?github=error", request.url));
  }

  const emails = Array.isArray(emailsData)
    ? (emailsData as Array<{ email: string; verified?: boolean }>)
        .map((e) => e.email)
        .join(",")
    : userData.email || "";
  const name = userData.name || "";

  const [existing] = await db
    .select()
    .from(githubAuth)
    .where(eq(githubAuth.userId, user.id));
  if (existing) {
    await db
      .update(githubAuth)
      .set({
        accessToken: tokenData.access_token,
        username: userData.login,
        name,
        emails,
      })
      .where(eq(githubAuth.id, existing.id));
  } else {
    await db.insert(githubAuth).values({
      id: randomUUID(),
      userId: user.id,
      accessToken: tokenData.access_token,
      username: userData.login,
      name,
      emails,
    });
  }

  return NextResponse.redirect(new URL("/worklog?github=connected", request.url));
}
