"use client";

import { useState } from "react";
import { CalendarCheck, Loader2, PiggyBank, Sparkles } from "lucide-react";
import { toast } from "sonner";

const KINDS = [
  {
    key: "daily",
    title: "Daily plan",
    description: "Order today's tasks, events and habits into a plan",
    icon: CalendarCheck,
  },
  {
    key: "weekly",
    title: "Weekly review",
    description: "Done vs slipped, habits, money, next week's focus",
    icon: Sparkles,
  },
  {
    key: "spending",
    title: "Spending insights",
    description: "Anomalies and patterns from the last 3 months",
    icon: PiggyBank,
  },
] as const;

export default function InsightsPage() {
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function generate(kind: string) {
    setLoading(kind);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResults((r) => ({ ...r, [kind]: data.result }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">
          AI-generated reviews from your real data
        </p>
      </header>

      <div className="space-y-4">
        {KINDS.map((k) => (
          <section
            key={k.key}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <k.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h2 className="text-sm font-semibold">{k.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {k.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => generate(k.key)}
                disabled={loading !== null}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading === k.key ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generate
              </button>
            </div>
            {results[k.key] && (
              <div className="prose prose-sm dark:prose-invert mt-4 max-w-none whitespace-pre-wrap border-t border-border pt-3 text-sm">
                {results[k.key]}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
