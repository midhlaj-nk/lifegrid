import { NextResponse } from "next/server";
import {
  getApiUser,
  unauthorized,
  getWorklogSettings,
  upsertWorklogSettings,
} from "@/lib/worklog/server";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  try {
    const settings = await getWorklogSettings(user.id);
    return NextResponse.json(settings || {});
  } catch (e: unknown) {
    console.error("[settings GET]", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

const ALLOWED = [
  "odooUrl", "odooUsername", "odooPassword", "odooDatabase",
  "emailRecipients", "emailCc", "emailBcc",
  "signatureName", "signatureDesignation", "signatureDepartment", "signatureCompany",
  "signatureEmail", "signaturePhone", "signatureWhatsapp",
  "descriptionStyle", "weeklyFilterTo", "displayName",
  "wordCountMode", "wordCountShort", "wordCountConcise", "wordCountDetailed",
  "aiProvider", "openrouterApiKey", "openrouterModel", "geminiApiKey", "geminiModel",
  "dailyColumns", "weeklyColumns", "dailyCustomColumns",
  "dailyColumnWidths", "weeklyColumnWidths",
] as const;

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const key of ALLOWED) {
      if (key in body) data[key] = body[key];
    }
    await upsertWorklogSettings(user.id, data);
    const settings = await getWorklogSettings(user.id);
    return NextResponse.json(settings);
  } catch (e: unknown) {
    console.error("[settings POST]", e);
    return NextResponse.json(
      { error: (e as Error).message || "DB error" },
      { status: 500 }
    );
  }
}
