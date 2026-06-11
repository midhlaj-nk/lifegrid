import { format } from "date-fns";
import { requireUser } from "@/lib/session";
import { getBudgetsWithSpend, getCategories } from "@/lib/finance-queries";
import { BudgetsClient } from "./budgets-client";

export default async function BudgetsPage() {
  const user = await requireUser();
  const month = format(new Date(), "yyyy-MM");
  const [budgets, categories] = await Promise.all([
    getBudgetsWithSpend(user.id, month),
    getCategories(user.id),
  ]);

  return (
    <BudgetsClient
      budgets={budgets}
      categories={categories.filter((c) => c.kind === "expense")}
      allCategories={categories}
    />
  );
}
