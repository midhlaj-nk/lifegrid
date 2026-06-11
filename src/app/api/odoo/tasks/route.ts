import { NextResponse } from "next/server";
import {
  getApiUser,
  unauthorized,
  getWorklogSettings,
} from "@/lib/worklog/server";
import { getTasks } from "@/lib/worklog/odoo";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId)
    return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const settings = await getWorklogSettings(user.id);
  if (!settings?.odooUrl)
    return NextResponse.json({ error: "Odoo not configured" }, { status: 400 });

  try {
    const tasks = await getTasks(
      {
        url: settings.odooUrl,
        database: settings.odooDatabase,
        username: settings.odooUsername,
        password: settings.odooPassword,
      },
      parseInt(projectId)
    );
    return NextResponse.json(tasks);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
