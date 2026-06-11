import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sheets } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { SheetsList } from "./sheets-list";

export default async function SheetsPage() {
  const user = await requireUser();
  const rows = await db
    .select({
      id: sheets.id,
      name: sheets.name,
      updatedAt: sheets.updatedAt,
    })
    .from(sheets)
    .where(eq(sheets.userId, user.id))
    .orderBy(desc(sheets.updatedAt));

  return (
    <SheetsList
      sheets={rows.map((s) => ({ ...s, updatedAt: s.updatedAt.toISOString() }))}
    />
  );
}
