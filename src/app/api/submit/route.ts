import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { repoMappings, worklogSubmissions } from "@/db/schema";
import {
  getApiUser,
  unauthorized,
  getWorklogSettings,
  getGoogleAuth,
} from "@/lib/worklog/server";
import { createTimesheetEntry } from "@/lib/worklog/odoo";
import { sendWorkReport } from "@/lib/worklog/email";
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

interface SubmitBody {
  date: string;
  entries: TimesheetEntry[];
  pushOdoo?: boolean;
  sendEmail?: boolean;
  customHtml?: string;
  customSubject?: string;
  customTo?: string[];
  customCc?: string[];
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body: SubmitBody = await request.json();
  const {
    date,
    entries,
    pushOdoo = true,
    sendEmail = true,
    customHtml,
    customSubject,
    customTo,
    customCc,
  } = body;
  if (!entries?.length)
    return NextResponse.json({ error: "No entries" }, { status: 400 });
  if (!pushOdoo && !sendEmail)
    return NextResponse.json(
      { error: "Select at least one action" },
      { status: 400 }
    );

  const [settings, google] = await Promise.all([
    getWorklogSettings(user.id),
    getGoogleAuth(user.id),
  ]);

  if (!settings)
    return NextResponse.json(
      { error: "Settings not configured" },
      { status: 400 }
    );

  const results = {
    odoo: [] as number[],
    odooErrors: [] as string[],
    odooSkipped: !pushOdoo,
    emailSent: false,
    emailError: "",
    emailSkipped: !sendEmail,
  };

  if (pushOdoo) {
    const odooConfig = {
      url: settings.odooUrl,
      database: settings.odooDatabase,
      username: settings.odooUsername,
      password: settings.odooPassword,
    };
    const odooResults = await Promise.all(
      entries.map((entry) =>
        createTimesheetEntry(odooConfig, {
          projectId: entry.projectId,
          taskId: entry.taskId,
          date,
          hours: entry.hours,
          description: entry.description,
          status: entry.status,
        })
          .then((id) => ({ ok: true as const, id }))
          .catch((e: unknown) => ({
            ok: false as const,
            msg: (e as Error).message,
          }))
      )
    );
    for (const r of odooResults) {
      if (r.ok) results.odoo.push(r.id);
      else results.odooErrors.push(r.msg);
    }
  }

  if (sendEmail) {
    const recipients =
      customTo !== undefined ? customTo : parseEmailList(settings.emailRecipients);
    const cc = customCc !== undefined ? customCc : parseEmailList(settings.emailCc);
    const bcc = parseEmailList(settings.emailBcc);
    const customCols = parseCustomColumns(settings?.dailyCustomColumns);
    const widthOverrides = parseColumnWidths(settings?.dailyColumnWidths);

    if (recipients.length === 0) {
      results.emailError = "No recipients configured";
    } else if (!google?.accessToken) {
      results.emailError =
        "Google not connected — connect Gmail in Worklog Settings";
    } else {
      try {
        await sendWorkReport({
          accessToken: google.accessToken,
          refreshToken: google.refreshToken || null,
          userEmail: google.email || user.email,
          userName: user.name || user.email || "User",
          subjectName: settings?.displayName || undefined,
          recipients,
          cc,
          bcc,
          date,
          entries,
          signatureFields: extractSignatureFields(settings),
          columns: parseDailyColumns(settings?.dailyColumns, customCols),
          customColumns: customCols,
          widthOverrides,
          customHtml,
          customSubject,
        });
        results.emailSent = true;
      } catch (e: unknown) {
        results.emailError = (e as Error).message;
      }
    }
  }

  await db.insert(worklogSubmissions).values({
    id: randomUUID(),
    userId: user.id,
    date,
    entries: JSON.stringify(entries),
    emailSent: results.emailSent,
    odooSynced: results.odoo.length > 0 && results.odooErrors.length === 0,
  });

  const taggedEntries = (
    entries as (TimesheetEntry & { __repo?: string })[]
  ).filter((e) => e.__repo && e.projectId && e.taskId);
  await Promise.all(
    taggedEntries.map(async (e) => {
      try {
        const [existing] = await db
          .select()
          .from(repoMappings)
          .where(
            and(
              eq(repoMappings.userId, user.id),
              eq(repoMappings.repoFullName, e.__repo!)
            )
          );
        if (existing) {
          await db
            .update(repoMappings)
            .set({
              projectId: e.projectId,
              projectName: e.projectName,
              taskId: e.taskId,
              taskName: e.taskName,
              count: sql`${repoMappings.count} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(repoMappings.id, existing.id));
        } else {
          await db.insert(repoMappings).values({
            id: randomUUID(),
            userId: user.id,
            repoFullName: e.__repo!,
            projectId: e.projectId,
            projectName: e.projectName,
            taskId: e.taskId,
            taskName: e.taskName,
          });
        }
      } catch (err) {
        console.error("[submit] repo mapping save failed", err);
      }
    })
  );

  return NextResponse.json(results);
}
