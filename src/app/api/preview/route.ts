import { NextResponse } from "next/server";
import {
  getApiUser,
  unauthorized,
  getWorklogSettings,
} from "@/lib/worklog/server";
import { buildEmailHtml, formatEmailDate } from "@/lib/worklog/email";
import { parseEmailList } from "@/lib/utils";
import { extractSignatureFields } from "@/lib/worklog/signature-template";
import {
  parseDailyColumns,
  parseCustomColumns,
  parseColumnWidths,
} from "@/lib/worklog/template-columns";

interface TimesheetEntry {
  projectId: number;
  projectName: string;
  taskId: number;
  taskName: string;
  hours: number;
  description: string;
  status?: string;
  custom?: Record<string, string>;
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { date, entries }: { date: string; entries: TimesheetEntry[] } =
    await request.json();
  if (!entries?.length)
    return NextResponse.json({ error: "No entries" }, { status: 400 });

  const settings = await getWorklogSettings(user.id);

  const userName = user.name || user.email || "User";
  const subjectName = settings?.displayName || userName;

  const customColumns = parseCustomColumns(settings?.dailyCustomColumns);
  const widthOverrides = parseColumnWidths(settings?.dailyColumnWidths);
  const html = buildEmailHtml({
    date,
    entries,
    signatureFields: extractSignatureFields(settings),
    columns: parseDailyColumns(settings?.dailyColumns, customColumns),
    customColumns,
    widthOverrides,
  });

  const subject = `Daily Work Report_${formatEmailDate(date)}_${subjectName.toUpperCase()}`;
  const to = parseEmailList(settings?.emailRecipients);
  const cc = parseEmailList(settings?.emailCc);
  const bcc = parseEmailList(settings?.emailBcc);

  return NextResponse.json({ html, subject, to, cc, bcc });
}
