import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sheets } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { SheetEditorShell } from "./sheet-editor-shell";

export default async function SheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [sheet] = await db
    .select()
    .from(sheets)
    .where(and(eq(sheets.id, id), eq(sheets.userId, user.id)));
  if (!sheet) notFound();

  return (
    <SheetEditorShell sheetId={sheet.id} name={sheet.name} data={sheet.data} />
  );
}
