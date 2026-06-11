import { NextResponse } from "next/server";
import {
  getApiUser,
  unauthorized,
  getWorklogSettings,
} from "@/lib/worklog/server";
import { buildWeeklyEmailHtml } from "@/lib/worklog/email";
import { extractSignatureFields } from "@/lib/worklog/signature-template";
import {
  parseWeeklyColumns,
  parseColumnWidths,
} from "@/lib/worklog/template-columns";

interface WeeklyEntry {
  projectName: string;
  taskName: string;
  status: string;
  description: string;
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { weekLabel, entries }: { weekLabel: string; entries: WeeklyEntry[] } =
    await request.json();
  if (!weekLabel || !entries?.length)
    return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const settings = await getWorklogSettings(user.id);

  const html = buildWeeklyEmailHtml({
    weekLabel,
    entries,
    signatureFields: extractSignatureFields(settings),
    columns: parseWeeklyColumns(settings?.weeklyColumns),
    widthOverrides: parseColumnWidths(settings?.weeklyColumnWidths),
  });

  return NextResponse.json({ html });
}
