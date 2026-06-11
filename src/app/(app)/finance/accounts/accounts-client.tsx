"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createFinAccount, deleteFinAccount } from "@/actions/finance";
import { formatINR, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "bank", label: "🏦 Bank" },
  { value: "cash", label: "💵 Cash" },
  { value: "card", label: "💳 Credit card" },
  { value: "upi", label: "📱 UPI wallet" },
] as const;

interface AccountRow {
  id: string;
  name: string;
  type: string;
  color: string;
  balanceMinor: number;
  openingBalanceMinor: number;
}

export function AccountsClient({ accounts }: { accounts: AccountRow[] }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("bank");
  const [opening, setOpening] = useState("");
  const [pending, startTransition] = useTransition();

  const total = accounts.reduce((s, a) => s + a.balanceMinor, 0);

  return (
    <div className="space-y-4">
      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            startTransition(async () => {
              await createFinAccount({
                name: name.trim(),
                type,
                openingBalance: toMinor(opening || "0"),
              });
              setName("");
              setOpening("");
              setAdding(false);
            });
          }}
          className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-4"
        >
          <input
            autoFocus
            placeholder="Account name (HDFC, Wallet…)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            placeholder="₹ opening balance"
            inputMode="decimal"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm outline-none"
          />
          <button
            disabled={pending || !name.trim()}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="h-9 rounded-md border border-border px-4 text-sm hover:bg-accent"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> New account
        </button>
      )}

      <div className="space-y-2">
        {accounts.map((a) => (
          <div
            key={a.id}
            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <span className="text-xl">
              {TYPES.find((t) => t.value === a.type)?.label.split(" ")[0] ?? "🏦"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.name}</p>
              <p className="text-[11px] capitalize text-muted-foreground">
                {a.type} · opening {formatINR(a.openingBalanceMinor)}
              </p>
            </div>
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                a.balanceMinor < 0 && "text-red-500"
              )}
            >
              {formatINR(a.balanceMinor)}
            </span>
            <button
              onClick={() => {
                if (
                  confirm(
                    `Delete "${a.name}"? All its transactions are deleted too.`
                  )
                )
                  startTransition(() => deleteFinAccount(a.id));
              }}
              className="hidden text-muted-foreground hover:text-red-500 group-hover:block"
              aria-label="Delete account"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {accounts.length === 0 && !adding && (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No accounts yet — add your bank, cash, cards, UPI wallets.
          </p>
        )}
      </div>

      {accounts.length > 0 && (
        <p className="text-right text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{formatINR(total)}</span>
        </p>
      )}
    </div>
  );
}
