"use client";

import { useState, useTransition } from "react";
import { setBudget } from "@/actions/finance";
import { formatINR, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

interface BudgetRow {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  monthlyLimitMinor: number;
  spentMinor: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

export function BudgetsClient({
  budgets,
  categories,
}: {
  budgets: BudgetRow[];
  categories: Category[];
}) {
  const [pending, startTransition] = useTransition();
  const budgeted = new Set(budgets.map((b) => b.categoryId));
  const unbudgeted = categories.filter((c) => !budgeted.has(c.id));
  const [catId, setCatId] = useState("");
  const [limit, setLimit] = useState("");

  return (
    <div className={cn("space-y-4", pending && "opacity-70")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!catId || toMinor(limit) <= 0) return;
          startTransition(async () => {
            await setBudget(catId, toMinor(limit));
            setCatId("");
            setLimit("");
          });
        }}
        className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-4"
      >
        <select
          value={catId}
          onChange={(e) => setCatId(e.target.value)}
          className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none"
        >
          <option value="">Pick category…</option>
          {unbudgeted.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <input
          placeholder="₹ monthly limit"
          inputMode="decimal"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm outline-none"
        />
        <button
          disabled={!catId || toMinor(limit) <= 0}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Set budget
        </button>
      </form>

      <div className="space-y-3">
        {budgets.map((b) => {
          const pct = Math.min(
            100,
            Math.round((b.spentMinor / b.monthlyLimitMinor) * 100)
          );
          const over = b.spentMinor > b.monthlyLimitMinor;
          return (
            <div key={b.id} className="rounded-lg border border-border bg-card p-3">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span>
                  {b.categoryIcon} {b.categoryName}
                </span>
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "tabular-nums",
                      over ? "font-semibold text-red-500" : "text-muted-foreground"
                    )}
                  >
                    {formatINR(b.spentMinor)} / {formatINR(b.monthlyLimitMinor)}
                  </span>
                  <button
                    onClick={() => {
                      const v = prompt(
                        `New monthly limit for ${b.categoryName} (₹, 0 removes):`,
                        String(b.monthlyLimitMinor / 100)
                      );
                      if (v !== null)
                        startTransition(() => setBudget(b.categoryId, toMinor(v)));
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </button>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-accent">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {over && (
                <p className="mt-1 text-[11px] font-medium text-red-500">
                  Over by {formatINR(b.spentMinor - b.monthlyLimitMinor)}
                </p>
              )}
            </div>
          );
        })}
        {budgets.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No budgets set.
          </p>
        )}
      </div>
    </div>
  );
}
