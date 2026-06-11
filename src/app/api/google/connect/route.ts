import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/worklog/server";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId)
    return NextResponse.json(
      { error: "Google OAuth not configured — set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" },
      { status: 500 }
    );

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope:
      "openid email https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent",
    state: user.id,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
