import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getApiUser, unauthorized } from "@/lib/worklog/server";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "file required" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024)
    return NextResponse.json({ error: "Max 20 MB" }, { status: 413 });

  const ext = path.extname(file.name) || "";
  const name = `${randomUUID()}${ext}`;

  // Vercel Blob in production, local disk in dev
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${name}`, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${name}` });
}
