import { format } from "date-fns";
import { requireUser } from "@/lib/session";
import {
  getAccountsWithBalances,
  getCategories,
  getMonthTransactions,
} from "@/lib/finance-queries";
import { TransactionsClient } from "./transactions-client";

export default async function TransactionsPage({
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

  const [accounts, categories, txs] = await Promise.all([
    getAccountsWithBalances(user.id),
    getCategories(user.id),
    getMonthTransactions(user.id, month),
  ]);

  return (
    <TransactionsClient
      month={month}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      categories={categories}
      transactions={txs}
    />
  );
}
