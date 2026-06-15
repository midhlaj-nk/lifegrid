import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getTokenForUser, createTokenForUser } from "@/lib/api-tokens";

export async function GET() {
  const user = await requireUser();
  let token = await getTokenForUser(user.id);
  if (!token) token = await createTokenForUser(user.id);
  return NextResponse.json({ token });
}

export async function POST() {
  const user = await requireUser();
  const token = await createTokenForUser(user.id);
  return NextResponse.json({ token });
}
