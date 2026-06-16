import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { finBudgets, finCategories } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const budgets = await db
      .select({
        id: finBudgets.id,
        categoryId: finBudgets.categoryId,
        categoryName: finCategories.name,
        categoryIcon: finCategories.icon,
        monthlyLimitMinor: finBudgets.monthlyLimitMinor,
      })
      .from(finBudgets)
      .innerJoin(finCategories, eq(finBudgets.categoryId, finCategories.id))
      .where(eq(finBudgets.userId, user.id));

    return NextResponse.json({ budgets });
  } catch (err) {
    console.error("[finance/budgets GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { categoryId, monthlyLimitMinor } = body as {
      categoryId: string;
      monthlyLimitMinor: number;
    };

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }
    if (monthlyLimitMinor === undefined || monthlyLimitMinor === null) {
      return NextResponse.json({ error: "monthlyLimitMinor is required" }, { status: 400 });
    }

    // Check if budget already exists for this user + categoryId
    const existing = await db
      .select({ id: finBudgets.id })
      .from(finBudgets)
      .where(and(eq(finBudgets.userId, user.id), eq(finBudgets.categoryId, categoryId)))
      .limit(1);

    if (existing.length > 0) {
      // Update existing budget
      await db
        .update(finBudgets)
        .set({ monthlyLimitMinor })
        .where(and(eq(finBudgets.userId, user.id), eq(finBudgets.categoryId, categoryId)));

      return NextResponse.json({ id: existing[0].id });
    }

    // Insert new budget
    const id = randomUUID();
    await db.insert(finBudgets).values({
      id,
      userId: user.id,
      categoryId,
      monthlyLimitMinor,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[finance/budgets POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
