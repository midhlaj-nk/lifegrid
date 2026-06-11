"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMonths, format, parseISO } from "date-fns";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createTransaction, deleteTransaction } from "@/actions/finance";
import { formatINR, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
}
interface Category {
  id: string;
  name: string;
  icon: string;
  kind: "expense" | "income";
}
interface Tx {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: "expense" | "income" | "transfer";
  amountMinor: number;
  originalAmount: string | null;
  originalCurrency: string | null;
  date: string;
  note: string;
  transferToAccountId: string | null;
}

export function TransactionsClient({
  month,
  accounts,
  categories,
  transactions,
}: {
  month: string;
  accounts: Account[];
  categories: Category[];
  transactions: Tx[];
}) {
  const router = useRouter();
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [foreign, setForeign] = useState(false);
  const [fxCurrency, setFxCurrency] = useState("USD");
  const [fxRate, setFxRate] = useState("");
  const [pending, startTransition] = useTransition();

  const visibleCategories = categories.filter((c) =>
    type === "income" ? c.kind === "income" : c.kind === "expense"
  );

  const byDate = useMemo(() => {
    const m = new Map<string, Tx[]>();
    for (const t of transactions) {
      if (!m.has(t.date)) m.set(t.date, []);
      m.get(t.date)!.push(t);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  const accountName = (id: string | null) =>
    accounts.find((a) => a.id === id)?.name ?? "?";
  const category = (id: string | null) => categories.find((c) => c.id === id);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = toMinor(amount);
    if (raw <= 0) return;
    const amountMinor =
      foreign && fxRate ? Math.round(raw * parseFloat(fxRate)) : raw;
    startTransition(async () => {
      const res = await createTransaction({
        accountId,
        categoryId: type === "transfer" ? null : categoryId || null,
        type,
        amountMinor,
        date,
        note,
        transferToAccountId: type === "transfer" ? toAccountId : null,
        originalAmount: foreign ? amount : null,
        originalCurrency: foreign ? fxCurrency : null,
      });
      if (res.error) toast.error(res.error);
      else {
        setAmount("");
        setNote("");
        toast.success("Logged");
      }
    });
  }

  if (!accounts.length) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Create an account first (Accounts tab).
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={submit}
        className="space-y-3 rounded-lg border border-border bg-card p-4"
      >
        <div className="flex gap-1">
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm capitalize",
                type === t
                  ? t === "expense"
                    ? "bg-red-500/15 font-medium text-red-500"
                    : t === "income"
                      ? "bg-emerald-500/15 font-medium text-emerald-600 dark:text-emerald-400"
                      : "bg-accent font-medium"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            autoFocus
            inputMode="decimal"
            placeholder={foreign ? `${fxCurrency} amount` : "₹ amount"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-10 w-32 rounded-md border border-input bg-background px-3 text-lg font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm outline-none"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {type === "transfer" ? `From: ${a.name}` : a.name}
              </option>
            ))}
          </select>
          {type === "transfer" ? (
            <>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm outline-none"
              >
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      To: {a.name}
                    </option>
                  ))}
              </select>
            </>
          ) : (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-2 text-sm outline-none"
            >
              <option value="">No category</option>
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none"
          />
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={foreign}
              onChange={(e) => setForeign(e.target.checked)}
            />
            Foreign currency
          </label>
          {foreign && (
            <>
              <input
                value={fxCurrency}
                onChange={(e) => setFxCurrency(e.target.value.toUpperCase())}
                className="h-9 w-16 rounded-md border border-input bg-background px-2 text-sm outline-none"
                aria-label="Currency code"
              />
              <input
                placeholder="Rate → INR"
                inputMode="decimal"
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm outline-none"
              />
              {amount && fxRate && (
                <span className="text-xs text-muted-foreground">
                  = {formatINR(Math.round(toMinor(amount) * parseFloat(fxRate || "0")))}
                </span>
              )}
            </>
          )}
          <button
            disabled={pending || toMinor(amount) <= 0 || (foreign && !fxRate)}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {format(parseISO(`${month}-01`), "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              router.push(
                `/finance/transactions?month=${format(addMonths(parseISO(`${month}-01`), -1), "yyyy-MM")}`
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
                `/finance/transactions?month=${format(addMonths(parseISO(`${month}-01`), 1), "yyyy-MM")}`
              )
            }
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {byDate.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No transactions this month.
        </p>
      )}

      {byDate.map(([d, txs]) => (
        <div key={d}>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {format(parseISO(d), "EEE, d MMM")}
          </p>
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {txs.map((t) => {
              const cat = category(t.categoryId);
              return (
                <div key={t.id} className="group flex items-center gap-2 px-3 py-2">
                  <span className="text-base">
                    {t.type === "transfer" ? "🔁" : (cat?.icon ?? "💸")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {t.note ||
                        (t.type === "transfer"
                          ? `${accountName(t.accountId)} → ${accountName(t.transferToAccountId)}`
                          : (cat?.name ?? "Uncategorized"))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {accountName(t.accountId)}
                      {cat && t.note ? ` · ${cat.name}` : ""}
                      {t.originalCurrency
                        ? ` · ${t.originalCurrency} ${t.originalAmount}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      t.type === "expense" && "text-red-500",
                      t.type === "income" &&
                        "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {t.type === "expense" ? "−" : t.type === "income" ? "+" : ""}
                    {formatINR(t.amountMinor)}
                  </span>
                  <button
                    onClick={() => startTransition(() => deleteTransaction(t.id))}
                    className="hidden text-muted-foreground hover:text-red-500 group-hover:block"
                    aria-label="Delete transaction"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
