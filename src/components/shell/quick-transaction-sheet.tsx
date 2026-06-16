"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "vaul";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { createTransaction, getQuickFinanceData } from "@/actions/finance";
import { toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

type Account = { id: string; name: string };
type Category = { id: string; name: string; icon: string; kind: "expense" | "income" };

export function QuickTransactionSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");

  // Lazy-load accounts + categories on first open
  useEffect(() => {
    if (!open || loaded) return;
    getQuickFinanceData().then(({ accounts, categories }) => {
      setAccounts(accounts);
      setCategories(categories);
      setAccountId(accounts[0]?.id ?? "");
      setLoaded(true);
    });
  }, [open, loaded]);

  // Reset type → reset category selection
  useEffect(() => { setCategoryId(""); }, [type]);

  const visibleCats = categories.filter((c) => c.kind === type);

  function reset() {
    setAmount("");
    setCategoryId("");
    setNote("");
    setType("expense");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const minor = toMinor(amount);
    if (!minor || minor <= 0) { toast.error("Enter a valid amount"); return; }
    if (!accountId) { toast.error("No account found"); return; }
    startTransition(async () => {
      const res = await createTransaction({
        accountId,
        categoryId: categoryId || null,
        type,
        amountMinor: minor,
        date: format(new Date(), "yyyy-MM-dd"),
        note,
      });
      if (res?.error) { toast.error(res.error); return; }
      toast.success(type === "expense" ? "Expense recorded" : "Income recorded");
      router.refresh();
      handleClose();
    });
  }

  return (
    <Drawer.Root open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[95] bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[96] flex flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl outline-none">
          {/* drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1.5 w-12 rounded-full bg-border/80" />
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4 px-5 pb-8 pt-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Quick transaction</h2>
              {/* type toggle */}
              <div className="flex rounded-full border border-border p-0.5 text-xs font-medium">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "rounded-full px-3 py-1 transition-colors capitalize",
                      type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount — big, numeric */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-light text-muted-foreground">₹</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-16 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-3xl font-semibold outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Category pills */}
            {loaded && visibleCats.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {visibleCats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(categoryId === c.id ? "" : c.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      categoryId === c.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    <span>{c.icon}</span>
                    {c.name}
                    {categoryId === c.id && <Check className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            )}

            {/* Account + note row */}
            <div className="flex gap-2">
              {accounts.length > 1 && (
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={pending || !amount}
              className="h-13 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50 active:scale-[0.98]"
            >
              {pending ? "Saving…" : `Add ${type}`}
            </button>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
