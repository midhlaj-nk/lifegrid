import { NextResponse } from "next/server";
import { getApiUser, saveGoogleTokens } from "@/lib/worklog/server";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.redirect(new URL("/", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || state !== user.id) {
    return NextResponse.redirect(
      new URL("/worklog/settings?google=error", request.url)
    );
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error("[google/callback] token exchange failed", tokenData);
    return NextResponse.redirect(
      new URL("/worklog/settings?google=error", request.url)
    );
  }

  // Identify the Gmail address
  let email = "";
  try {
    const infoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    if (infoRes.ok) email = (await infoRes.json()).email ?? "";
  } catch {
    // non-fatal
  }

  await saveGoogleTokens(user.id, {
    email,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null,
  });

  return NextResponse.redirect(
    new URL("/worklog/settings?google=connected", request.url)
  );
}
