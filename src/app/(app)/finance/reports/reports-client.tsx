"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

interface TxLite {
  type: string;
  amountMinor: number;
  categoryId: string | null;
  date: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  kind: string;
}

interface MonthSummary {
  month: string;
  incomeMinor: number;
  expenseMinor: number;
}

export function ReportsClient({
  month,
  transactions,
  categories,
  trend,
}: {
  month: string;
  transactions: TxLite[];
  categories: Category[];
  trend: MonthSummary[];
}) {
  const router = useRouter();

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amountMinor, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amountMinor, 0);
  const savingsRate =
    income > 0 ? Math.round(((income - expense) / income) * 100) : null;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const key = t.categoryId ?? "none";
      map.set(key, (map.get(key) ?? 0) + t.amountMinor);
    }
    return [...map.entries()]
      .map(([id, amt]) => ({
        category: categories.find((c) => c.id === id),
        amountMinor: amt,
      }))
      .sort((a, b) => b.amountMinor - a.amountMinor);
  }, [transactions, categories]);

  const maxCat = byCategory[0]?.amountMinor ?? 1;
  const maxTrend = Math.max(
    1,
    ...trend.map((m) => Math.max(m.incomeMinor, m.expenseMinor))
  );

  // cashflow heat per day
  const days = eachDayOfInterval({
    start: startOfMonth(parseISO(`${month}-01`)),
    end: endOfMonth(parseISO(`${month}-01`)),
  });
  const perDay = new Map<string, { in: number; out: number }>();
  for (const t of transactions) {
    const e = perDay.get(t.date) ?? { in: 0, out: 0 };
    if (t.type === "income") e.in += t.amountMinor;
    else if (t.type === "expense") e.out += t.amountMinor;
    perDay.set(t.date, e);
  }
  const maxDayOut = Math.max(1, ...[...perDay.values()].map((d) => d.out));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {format(parseISO(`${month}-01`), "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              router.push(
                `/finance/reports?month=${format(addMonths(parseISO(`${month}-01`), -1), "yyyy-MM")}`
              )
            }
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              router.push(
                `/finance/reports?month=${format(addMonths(parseISO(`${month}-01`), 1), "yyyy-MM")}`
              )
            }
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Income" value={formatINR(income)} tone="green" />
        <Stat label="Expense" value={formatINR(expense)} tone="red" />
        <Stat
          label="Savings rate"
          value={savingsRate === null ? "—" : `${savingsRate}%`}
        />
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Spending by category</h3>
        {byCategory.length ? (
          <div className="space-y-2">
            {byCategory.map(({ category, amountMinor }) => (
              <div key={category?.id ?? "none"}>
                <div className="mb-0.5 flex justify-between text-xs">
                  <span>
                    {category ? `${category.icon} ${category.name}` : "Uncategorized"}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatINR(amountMinor)} (
                    {expense ? Math.round((amountMinor / expense) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-accent">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(amountMinor / maxCat) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No expenses this month.</p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">6-month trend</h3>
        <div className="flex items-end justify-between gap-2">
          {trend.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-32 w-full items-end justify-center gap-1">
                <div
                  className="w-1/3 rounded-t bg-emerald-500/80"
                  style={{ height: `${(m.incomeMinor / maxTrend) * 100}%` }}
                  title={`Income ${formatINR(m.incomeMinor)}`}
                />
                <div
                  className="w-1/3 rounded-t bg-red-500/80"
                  style={{ height: `${(m.expenseMinor / maxTrend) * 100}%` }}
                  title={`Expense ${formatINR(m.expenseMinor)}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {format(parseISO(`${m.month}-01`), "MMM")}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500/80" /> income
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500/80" /> expense
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Cashflow calendar</h3>
        <div className="grid grid-cols-7 gap-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] text-muted-foreground">
              {d}
            </div>
          ))}
          {/* pad to Monday-start weekday of the 1st */}
          {Array.from(
            { length: (days[0].getDay() + 6) % 7 },
            (_, i) => <div key={`pad-${i}`} />
          )}
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const e = perDay.get(key);
            const intensity = e ? Math.min(1, e.out / maxDayOut) : 0;
            return (
              <div
                key={key}
                title={
                  e
                    ? `${format(d, "d MMM")}: out ${formatINR(e.out)}${e.in ? `, in ${formatINR(e.in)}` : ""}`
                    : format(d, "d MMM")
                }
                className={cn(
                  "flex aspect-square items-center justify-center rounded text-[10px]",
                  e?.in ? "ring-1 ring-emerald-500/60" : ""
                )}
                style={{
                  backgroundColor:
                    intensity > 0
                      ? `rgba(239,68,68,${0.12 + intensity * 0.55})`
                      : "var(--accent)",
                }}
              >
                {format(d, "d")}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Red intensity = spending; green ring = income that day.
        </p>
      </section>
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
        className={cn(
          "text-lg font-semibold",
          tone === "green" && "text-emerald-600 dark:text-emerald-400",
          tone === "red" && "text-red-500"
        )}
      >
        {value}
      </p>
    </div>
  );
}
