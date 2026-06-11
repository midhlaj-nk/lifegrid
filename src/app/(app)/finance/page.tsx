import { format } from "date-fns";
import { requireUser } from "@/lib/session";
import {
  ensureDefaultCategories,
  processDueSubscriptions,
} from "@/actions/finance";
import {
  getAccountsWithBalances,
  getBudgetsWithSpend,
  getLent,
  getMonthTransactions,
  getSavingsGoals,
  getSubscriptions,
} from "@/lib/finance-queries";
import { formatINR } from "@/lib/money";
import { OverviewSections } from "./overview-client";

export default async function FinanceOverview() {
  const user = await requireUser();
  await ensureDefaultCategories();
  await processDueSubscriptions();

  const month = format(new Date(), "yyyy-MM");
  const [accounts, monthTxs, budgets, subs, goals, lent] = await Promise.all([
    getAccountsWithBalances(user.id),
    getMonthTransactions(user.id, month),
    getBudgetsWithSpend(user.id, month),
    getSubscriptions(user.id),
    getSavingsGoals(user.id),
    getLent(user.id),
  ]);

  const income = monthTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amountMinor, 0);
  const expense = monthTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amountMinor, 0);

  const totalBalance = accounts.reduce((s, a) => s + a.balanceMinor, 0);
  const lentOpen = lent.filter((l) => !l.settled);
  const owedToMe = lentOpen
    .filter((l) => l.direction === "lent")
    .reduce((s, l) => s + l.amountMinor, 0);
  const iOwe = lentOpen
    .filter((l) => l.direction === "borrowed")
    .reduce((s, l) => s + l.amountMinor, 0);
  // net worth: account balances + receivables - payables
  const netWorth = totalBalance + owedToMe - iOwe;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Net worth" value={formatINR(netWorth)} />
        <Stat label="Accounts total" value={formatINR(totalBalance)} />
        <Stat
          label={`Income · ${format(new Date(), "MMM")}`}
          value={formatINR(income)}
          tone="green"
        />
        <Stat
          label={`Spent · ${format(new Date(), "MMM")}`}
          value={formatINR(expense)}
          tone="red"
        />
      </div>

      <OverviewSections
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          color: a.color,
          balanceMinor: a.balanceMinor,
        }))}
        budgets={budgets.map((b) => ({
          id: b.id,
          name: b.categoryName,
          icon: b.categoryIcon,
          limitMinor: b.monthlyLimitMinor,
          spentMinor: b.spentMinor,
        }))}
        subscriptions={subs
          .filter((s) => s.active)
          .slice(0, 6)
          .map((s) => ({
            id: s.id,
            name: s.name,
            amountMinor: s.amountMinor,
            nextDueDate: s.nextDueDate,
            cadence: s.cadence,
          }))}
        goals={goals.map((g) => ({
          id: g.id,
          name: g.name,
          targetMinor: g.targetMinor,
          savedMinor: g.savedMinor,
          deadline: g.deadline,
        }))}
        lent={lent.map((l) => ({
          id: l.id,
          person: l.person,
          direction: l.direction,
          amountMinor: l.amountMinor,
          date: l.date,
          settled: l.settled,
        }))}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "green"
            ? "text-lg font-semibold text-emerald-600 dark:text-emerald-400"
            : tone === "red"
              ? "text-lg font-semibold text-red-500"
              : "text-lg font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}
