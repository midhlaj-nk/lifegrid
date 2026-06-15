"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Check, Plus, Trash2 } from "lucide-react";
import {
  createSavingsGoal,
  addToSavingsGoal,
  deleteSavingsGoal,
  createLent,
  settleLent,
  deleteLent,
} from "@/actions/finance";
import { formatINR, toMinor } from "@/lib/money";
import { useConfirm } from "@/components/ui/app-dialog";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPE_ICON: Record<string, string> = {
  bank: "🏦",
  cash: "💵",
  card: "💳",
  upi: "📱",
};

function SpendingChart({ data }: { data: { date: string; amountMinor: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const byDay = new Map<string, number>();
  for (const tx of data) {
    byDay.set(tx.date, (byDay.get(tx.date) ?? 0) + tx.amountMinor);
  }

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().slice(0, 10);
    return { date: dateStr, amount: byDay.get(dateStr) ?? 0 };
  });

  const max = Math.max(...days.map((d) => d.amount), 1);
  const BAR_W = 100 / 30;

  return (
    <div className="relative">
      <svg
        viewBox="0 0 100 40"
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: 80 }}
      >
        {days.map((d, i) => {
          const h = (d.amount / max) * 36;
          const x = i * BAR_W + BAR_W * 0.1;
          const w = BAR_W * 0.8;
          return (
            <rect
              key={d.date}
              x={x}
              y={40 - h}
              width={w}
              height={h || 0.5}
              className={hovered === i ? "fill-primary" : "fill-primary/40"}
              rx="0.5"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>
      {hovered !== null && (
        <div
          className="pointer-events-none absolute top-0 text-xs bg-popover border border-border rounded px-2 py-1 shadow-md z-10"
          style={{
            left: `${(hovered / 30) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-medium">{days[hovered].date.slice(5)}</div>
          <div>{formatINR(days[hovered].amount)}</div>
        </div>
      )}
    </div>
  );
}

export function OverviewSections(props: {
  accounts: { id: string; name: string; type: string; color: string; balanceMinor: number }[];
  budgets: { id: string; name: string; icon: string; limitMinor: number; spentMinor: number }[];
  subscriptions: { id: string; name: string; amountMinor: number; nextDueDate: string; cadence: string }[];
  goals: { id: string; name: string; targetMinor: number; savedMinor: number; deadline: string | null }[];
  lent: { id: string; person: string; direction: string; amountMinor: number; date: string; settled: boolean }[];
  last30Days: { date: string; amountMinor: number }[];
}) {
  return (
    <div className="space-y-4">
      <Section title="Spending — last 30 days">
        <SpendingChart data={props.last30Days} />
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Accounts">
        {props.accounts.length ? (
          <div className="space-y-1.5">
            {props.accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span>{ACCOUNT_TYPE_ICON[a.type] ?? "🏦"}</span>
                <span className="flex-1 truncate">{a.name}</span>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    a.balanceMinor < 0 && "text-red-500"
                  )}
                >
                  {formatINR(a.balanceMinor)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="Add accounts in the Accounts tab." />
        )}
      </Section>

      <Section title="Budgets this month">
        {props.budgets.length ? (
          <div className="space-y-2.5">
            {props.budgets.map((b) => {
              const pct = Math.min(
                100,
                Math.round((b.spentMinor / b.limitMinor) * 100)
              );
              const over = b.spentMinor > b.limitMinor;
              return (
                <div key={b.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>
                      {b.icon} {b.name}
                    </span>
                    <span
                      className={cn(
                        "tabular-nums",
                        over ? "font-semibold text-red-500" : "text-muted-foreground"
                      )}
                    >
                      {formatINR(b.spentMinor)} / {formatINR(b.limitMinor)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        over
                          ? "bg-red-500"
                          : pct > 80
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty text="Set limits in the Budgets tab." />
        )}
      </Section>

      <Section title="Upcoming bills">
        {props.subscriptions.length ? (
          <div className="space-y-1.5">
            {props.subscriptions.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(s.nextDueDate), "d MMM")}
                </span>
                <span className="font-medium tabular-nums">
                  {formatINR(s.amountMinor)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No active subscriptions." />
        )}
      </Section>

      <SavingsGoals goals={props.goals} />
      <LentBorrowed lent={props.lent} />
    </div>
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function SavingsGoals({
  goals,
}: {
  goals: { id: string; name: string; targetMinor: number; savedMinor: number; deadline: string | null }[];
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addValue, setAddValue] = useState("");
  const [pending, startTransition] = useTransition();
  const confirmDialog = useConfirm();

  return (
    <Section
      title="Savings goals"
      action={
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded p-1 text-muted-foreground hover:bg-accent"
          aria-label="Add savings goal"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      }
    >
      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await createSavingsGoal({
                name,
                targetMinor: toMinor(target),
              });
              setName("");
              setTarget("");
              setAdding(false);
            });
          }}
          className="mb-3 flex gap-2"
        >
          <input
            autoFocus
            placeholder="Goal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none"
          />
          <input
            placeholder="₹ target"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm outline-none"
          />
          <button
            disabled={pending || !name.trim() || toMinor(target) <= 0}
            className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}
      {goals.length ? (
        <div className="space-y-2.5">
          {goals.map((g) => {
            const pct = Math.min(
              100,
              Math.round((g.savedMinor / g.targetMinor) * 100)
            );
            return (
              <div key={g.id} className="group">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>{g.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums text-muted-foreground">
                      {formatINR(g.savedMinor)} / {formatINR(g.targetMinor)} ({pct}%)
                    </span>
                    {addingTo === g.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (toMinor(addValue) > 0)
                            startTransition(() =>
                              addToSavingsGoal(g.id, toMinor(addValue))
                            );
                          setAddingTo(null);
                          setAddValue("");
                        }}
                        className="inline-flex"
                      >
                        <input
                          autoFocus
                          inputMode="decimal"
                          placeholder="₹"
                          value={addValue}
                          onChange={(e) => setAddValue(e.target.value)}
                          onBlur={() => setAddingTo(null)}
                          className="h-5 w-16 rounded border border-input bg-background px-1 text-[11px] outline-none"
                        />
                      </form>
                    ) : (
                      <button
                        onClick={() => setAddingTo(g.id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Add savings"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: `Delete goal "${g.name}"?`,
                          confirmLabel: "Delete",
                          danger: true,
                        });
                        if (ok) startTransition(() => deleteSavingsGoal(g.id));
                      }}
                      className="hidden text-muted-foreground hover:text-red-500 group-hover:block touch:block"
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !adding && <Empty text="No savings goals yet." />
      )}
    </Section>
  );
}

function LentBorrowed({
  lent,
}: {
  lent: { id: string; person: string; direction: string; amountMinor: number; date: string; settled: boolean }[];
}) {
  const [adding, setAdding] = useState(false);
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"lent" | "borrowed">("lent");
  const [pending, startTransition] = useTransition();

  const open = lent.filter((l) => !l.settled);

  return (
    <Section
      title="Lent / borrowed"
      action={
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded p-1 text-muted-foreground hover:bg-accent"
          aria-label="Add lent/borrowed"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      }
    >
      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await createLent({
                person,
                direction,
                amountMinor: toMinor(amount),
                date: format(new Date(), "yyyy-MM-dd"),
              });
              setPerson("");
              setAmount("");
              setAdding(false);
            });
          }}
          className="mb-3 flex flex-wrap gap-2"
        >
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "lent" | "borrowed")}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none"
          >
            <option value="lent">I lent to</option>
            <option value="borrowed">I borrowed from</option>
          </select>
          <input
            autoFocus
            placeholder="Person"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none"
          />
          <input
            placeholder="₹"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm outline-none"
          />
          <button
            disabled={pending || !person.trim() || toMinor(amount) <= 0}
            className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}
      {open.length ? (
        <div className="space-y-1.5">
          {open.map((l) => (
            <div key={l.id} className="group flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase",
                  l.direction === "lent"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/15 text-red-500"
                )}
              >
                {l.direction === "lent" ? "owes you" : "you owe"}
              </span>
              <span className="flex-1 truncate">{l.person}</span>
              <span className="font-medium tabular-nums">
                {formatINR(l.amountMinor)}
              </span>
              <button
                onClick={() => startTransition(() => settleLent(l.id))}
                title="Mark settled"
                className="text-muted-foreground hover:text-emerald-500"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => startTransition(() => deleteLent(l.id))}
                className="hidden text-muted-foreground hover:text-red-500 group-hover:block touch:block"
                aria-label="Delete entry"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        !adding && <Empty text="All settled." />
      )}
    </Section>
  );
}
