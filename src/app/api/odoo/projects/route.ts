import { NextResponse } from "next/server";
import {
  getApiUser,
  unauthorized,
  getWorklogSettings,
} from "@/lib/worklog/server";
import { getProjects } from "@/lib/worklog/odoo";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const settings = await getWorklogSettings(user.id);
  if (!settings?.odooUrl || !settings?.odooUsername || !settings?.odooPassword) {
    return NextResponse.json({ error: "Odoo not configured" }, { status: 400 });
  }

  try {
    const projects = await getProjects({
      url: settings.odooUrl,
      database: settings.odooDatabase,
      username: settings.odooUsername,
      password: settings.odooPassword,
    });
    return NextResponse.json(projects);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
