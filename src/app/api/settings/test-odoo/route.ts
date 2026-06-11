import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/worklog/server";
import { odooLogin } from "@/lib/worklog/odoo";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { url, database, username, password } = await request.json();

  try {
    const uid = await odooLogin({ url, database, username, password });
    return NextResponse.json({ success: true, uid });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
