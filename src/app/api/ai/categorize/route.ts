import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { finCategories } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/worklog/server";
import { getModel } from "@/lib/ai-provider";

export async function POST(req: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { descriptions }: { descriptions: string[] } = await req.json();
  if (!Array.isArray(descriptions) || !descriptions.length)
    return NextResponse.json({ error: "descriptions required" }, { status: 400 });

  let model;
  try {
    model = await getModel(user.id, "fast");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const cats = await db
    .select()
    .from(finCategories)
    .where(eq(finCategories.userId, user.id));
  const expenseCats = cats.filter((c) => c.kind === "expense");

  const { object } = await generateObject({
    model,
    schema: z.object({
      assignments: z.array(
        z.object({
          index: z.number().int(),
          category: z
            .string()
            .nullable()
            .describe("one of the allowed category names, or null if unclear"),
        })
      ),
    }),
    prompt: `Categorize these Indian bank-statement transaction descriptions.
Allowed categories: ${expenseCats.map((c) => c.name).join(", ")}.
Return one assignment per description index. Use null when genuinely unclear.

Descriptions:
${descriptions.slice(0, 100).map((d, i) => `${i}: ${d}`).join("\n")}`,
  });

  const byName = new Map(expenseCats.map((c) => [c.name.toLowerCase(), c.id]));
  return NextResponse.json({
    assignments: object.assignments.map((a) => ({
      index: a.index,
      categoryId: a.category ? (byName.get(a.category.toLowerCase()) ?? null) : null,
    })),
  });
}
