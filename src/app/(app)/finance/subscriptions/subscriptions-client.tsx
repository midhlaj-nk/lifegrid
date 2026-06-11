"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from "@/actions/finance";
import { useConfirm } from "@/components/ui/app-dialog";
import { formatINR, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

interface Sub {
  id: string;
  name: string;
  amountMinor: number;
  accountId: string;
  categoryId: string | null;
  cadence: "weekly" | "monthly" | "yearly";
  nextDueDate: string;
  active: boolean;
  autoLog: boolean;
}

export function SubscriptionsClient({
  subscriptions,
  accounts,
  categories,
}: {
  subscriptions: Sub[];
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; icon: string }[];
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [cadence, setCadence] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [nextDue, setNextDue] = useState(format(new Date(), "yyyy-MM-dd"));
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  const yearlyTotal = subscriptions
    .filter((s) => s.active)
    .reduce(
      (sum, s) =>
        sum +
        s.amountMinor * (s.cadence === "weekly" ? 52 : s.cadence === "monthly" ? 12 : 1),
      0
    );

  return (
    <div className="space-y-4">
      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || toMinor(amount) <= 0 || !accountId) return;
            startTransition(async () => {
              await createSubscription({
                name: name.trim(),
                amountMinor: toMinor(amount),
                accountId,
                categoryId: categoryId || null,
                cadence,
                nextDueDate: nextDue,
              });
              setName("");
              setAmount("");
              setAdding(false);
            });
          }}
          className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-4"
        >
          <input
            autoFocus
            placeholder="Name (rent, Netflix, EMI…)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            placeholder="₹"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm outline-none"
          />
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as typeof cadence)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Next due
            <input
              type="date"
              value={nextDue}
              onChange={(e) => setNextDue(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
            />
          </label>
          <button
            disabled={pending || !name.trim() || toMinor(amount) <= 0}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Add
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> New subscription
          </button>
          <p className="text-xs text-muted-foreground">
            Yearly cost:{" "}
            <span className="font-semibold text-foreground">
              {formatINR(yearlyTotal)}
            </span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        {subscriptions.map((s) => (
          <div
            key={s.id}
            className={cn(
              "group flex items-center gap-3 rounded-lg border border-border bg-card p-3",
              !s.active && "opacity-50"
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {s.cadence} · next {format(parseISO(s.nextDueDate), "d MMM yyyy")}
                {s.autoLog ? " · auto-logs" : ""}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {formatINR(s.amountMinor)}
            </span>
            <button
              onClick={() =>
                startTransition(() =>
                  updateSubscription(s.id, { active: !s.active })
                )
              }
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {s.active ? "Pause" : "Resume"}
            </button>
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete subscription "${s.name}"?`,
                  confirmLabel: "Delete",
                  danger: true,
                });
                if (ok) startTransition(() => deleteSubscription(s.id));
              }}
              className="hidden text-muted-foreground hover:text-red-500 group-hover:block touch:block"
              aria-label="Delete subscription"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {subscriptions.length === 0 && !adding && (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No subscriptions — add rent, EMIs, streaming.
          </p>
        )}
      </div>
    </div>
  );
}
