import { NextResponse } from "next/server";
import {
  getApiUser,
  unauthorized,
  getWorklogSettings,
  getGoogleAuth,
} from "@/lib/worklog/server";
import { sendWeeklyWorkReport } from "@/lib/worklog/email";
import { parseEmailList } from "@/lib/utils";
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
  if (!weekLabel)
    return NextResponse.json({ error: "weekLabel required" }, { status: 400 });
  if (!entries?.length)
    return NextResponse.json({ error: "No entries" }, { status: 400 });

  const [settings, google] = await Promise.all([
    getWorklogSettings(user.id),
    getGoogleAuth(user.id),
  ]);

  if (!settings)
    return NextResponse.json(
      { error: "Settings not configured" },
      { status: 400 }
    );
  if (!google?.accessToken) {
    return NextResponse.json(
      { error: "Google not connected — connect Gmail in Worklog Settings" },
      { status: 400 }
    );
  }

  const recipients = parseEmailList(settings.emailRecipients);
  const cc = parseEmailList(settings.emailCc);
  const bcc = parseEmailList(settings.emailBcc);

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients configured" },
      { status: 400 }
    );
  }

  try {
    await sendWeeklyWorkReport({
      accessToken: google.accessToken,
      refreshToken: google.refreshToken || null,
      userEmail: google.email || user.email,
      userName: user.name || user.email || "User",
      subjectName: settings.displayName || undefined,
      recipients,
      cc,
      bcc,
      weekLabel,
      entries,
      signatureFields: extractSignatureFields(settings),
      columns: parseWeeklyColumns(settings?.weeklyColumns),
      widthOverrides: parseColumnWidths(settings?.weeklyColumnWidths),
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
