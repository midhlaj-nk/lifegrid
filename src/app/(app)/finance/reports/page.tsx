import { format } from "date-fns";
import { requireUser } from "@/lib/session";
import {
  getCategories,
  getMonthTransactions,
  getMonthlyTrend,
} from "@/lib/finance-queries";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { month: qMonth } = await searchParams;
  const month =
    qMonth && /^\d{4}-\d{2}$/.test(qMonth)
      ? qMonth
      : format(new Date(), "yyyy-MM");

  const [txs, categories, trend] = await Promise.all([
    getMonthTransactions(user.id, month),
    getCategories(user.id),
    getMonthlyTrend(user.id, 6),
  ]);

  return (
    <ReportsClient
      month={month}
      transactions={txs.map((t) => ({
        type: t.type,
        amountMinor: t.amountMinor,
        categoryId: t.categoryId,
        date: t.date,
      }))}
      categories={categories}
      trend={trend}
    />
  );
}
