"use client";

import { useState, useTransition } from "react";
import { setBudget, createCategory, deleteCategory } from "@/actions/finance";
import { useConfirm } from "@/components/ui/app-dialog";
import { Plus, Trash2 } from "lucide-react";
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

function CategoryManager({ categories }: { categories: Category[] }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💸");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  return (
    <section className={cn("space-y-3 rounded-lg border border-border bg-card p-4", pending && "opacity-70")}>
      <h3 className="text-sm font-semibold">Categories</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          startTransition(async () => {
            await createCategory({ name: name.trim(), icon, kind });
            setName("");
          });
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="h-9 w-12 rounded-md border border-input bg-background text-center text-sm outline-none"
          aria-label="Emoji"
        />
        <input
          placeholder="New category"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "expense" | "income")}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <button
          disabled={!name.trim()}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm hover:bg-accent disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <span
            key={c.id}
            className="group inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs"
          >
            {c.icon} {c.name}
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete category "${c.name}"?`,
                  description: "Transactions keep their data but lose this category.",
                  confirmLabel: "Delete",
                  danger: true,
                });
                if (ok) startTransition(() => deleteCategory(c.id));
              }}
              className="hidden text-muted-foreground hover:text-red-500 group-hover:block touch:block"
              aria-label={`Delete ${c.name}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </section>
  );
}

export function BudgetsClient({
  budgets,
  categories,
  allCategories,
}: {
  budgets: BudgetRow[];
  categories: Category[];
  allCategories: Category[];
}) {
  const [pending, startTransition] = useTransition();
  const budgeted = new Set(budgets.map((b) => b.categoryId));
  const unbudgeted = categories.filter((c) => !budgeted.has(c.id));
  const [catId, setCatId] = useState("");
  const [limit, setLimit] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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
                  {editingId === b.categoryId ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        startTransition(() =>
                          setBudget(b.categoryId, toMinor(editValue))
                        );
                        setEditingId(null);
                      }}
                      className="inline-flex items-center gap-1"
                    >
                      <input
                        autoFocus
                        inputMode="decimal"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => setEditingId(null)}
                        className="h-6 w-20 rounded border border-input bg-background px-1.5 text-xs outline-none"
                      />
                    </form>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(b.categoryId);
                        setEditValue(String(b.monthlyLimitMinor / 100));
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Edit
                    </button>
                  )}
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

      <CategoryManager categories={allCategories} />
    </div>
  );
}
