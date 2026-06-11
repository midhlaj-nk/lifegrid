"use client";

import { useState, useTransition } from "react";
import { addDays, format, subDays } from "date-fns";
import { BarChart3, Check, Flame, Plus, Trash2 } from "lucide-react";
import { createHabit, deleteHabit, toggleHabitCheck } from "@/actions/habits";
import { useConfirm } from "@/components/ui/app-dialog";
import { cn } from "@/lib/utils";

interface HabitRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  weekdays: number[];
  checks: string[];
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function streak(checks: Set<string>, weekdays: number[]): number {
  let count = 0;
  let day = new Date();
  // today doesn't break the streak if not yet checked
  if (!checks.has(format(day, "yyyy-MM-dd"))) day = subDays(day, 1);
  for (let i = 0; i < 730; i++) {
    const applies = !weekdays.length || weekdays.includes(day.getDay());
    if (applies) {
      if (checks.has(format(day, "yyyy-MM-dd"))) count++;
      else break;
    }
    day = subDays(day, 1);
  }
  return count;
}

export function HabitsBoard({ habits }: { habits: HabitRow[] }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💪");
  const [days, setDays] = useState<number[]>([]);
  const [heatmapFor, setHeatmapFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

  return (
    <div className="space-y-3">
      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            startTransition(async () => {
              await createHabit({ name: name.trim(), icon, weekdays: days });
              setName("");
              setDays([]);
              setAdding(false);
            });
          }}
          className="space-y-3 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex gap-2">
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="h-9 w-12 rounded-md border border-input bg-background text-center text-sm outline-none"
              aria-label="Emoji"
            />
            <input
              autoFocus
              placeholder="Habit (gym, reading, water…)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs text-muted-foreground">Days:</span>
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setDays((d) =>
                    d.includes(i) ? d.filter((x) => x !== i) : [...d, i]
                  )
                }
                className={cn(
                  "h-7 w-7 rounded-full text-xs font-medium transition-colors",
                  days.includes(i)
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-muted-foreground"
                )}
              >
                {label}
              </button>
            ))}
            <span className="ml-1 text-[11px] text-muted-foreground">
              (none = every day)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              disabled={pending || !name.trim()}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Add habit
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="h-9 rounded-md border border-border px-4 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> New habit
        </button>
      )}

      {habits.length === 0 && !adding && (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No habits yet.
        </p>
      )}

      {habits.map((h) => {
        const checkSet = new Set(h.checks);
        const s = streak(checkSet, h.weekdays);
        const showHeat = heatmapFor === h.id;
        return (
          <div key={h.id} className="rounded-lg border border-border bg-card p-3">
          <div className="group flex items-center gap-3">
            <span className="text-xl">{h.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{h.name}</p>
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Flame
                  className={cn(
                    "h-3.5 w-3.5",
                    s > 0 ? "text-orange-500" : "text-muted-foreground/50"
                  )}
                />
                {s} day streak
              </p>
            </div>
            <div className="flex gap-1">
              {last7.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const applies =
                  !h.weekdays.length || h.weekdays.includes(d.getDay());
                const checked = checkSet.has(key);
                return (
                  <button
                    key={key}
                    disabled={!applies}
                    onClick={() =>
                      startTransition(() => toggleHabitCheck(h.id, key))
                    }
                    title={format(d, "EEE d MMM")}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md text-[10px] transition-colors",
                      !applies && "opacity-25",
                      checked
                        ? "text-white"
                        : "bg-accent text-muted-foreground hover:bg-accent/70"
                    )}
                    style={checked ? { backgroundColor: h.color } : undefined}
                  >
                    {checked ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : (
                      format(d, "d")
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setHeatmapFor(showHeat ? null : h.id)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Toggle history"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete habit "${h.name}"?`,
                  description: "Its full history is deleted.",
                  confirmLabel: "Delete",
                  danger: true,
                });
                if (ok) startTransition(() => deleteHabit(h.id));
              }}
              className="hidden text-muted-foreground hover:text-red-500 group-hover:block touch:block"
              aria-label="Delete habit"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {showHeat && <Heatmap checks={checkSet} color={h.color} weekdays={h.weekdays} />}
          </div>
        );
      })}
    </div>
  );
}


function Heatmap({
  checks,
  color,
  weekdays,
}: {
  checks: Set<string>;
  color: string;
  weekdays: number[];
}) {
  // last 12 weeks, columns = weeks, rows = Mon..Sun
  const today = new Date();
  const weeks: Date[][] = [];
  // find this week's Monday
  const monday = subDays(today, (today.getDay() + 6) % 7);
  for (let w = 11; w >= 0; w--) {
    const start = subDays(monday, w * 7);
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return (
    <div className="mt-3 flex gap-1 overflow-x-auto border-t border-border pt-3">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const future = d > today;
            const applies = !weekdays.length || weekdays.includes(d.getDay());
            const checked = checks.has(key);
            return (
              <div
                key={key}
                title={format(d, "EEE d MMM")}
                className="h-3.5 w-3.5 rounded-sm"
                style={{
                  backgroundColor: checked
                    ? color
                    : future || !applies
                      ? "transparent"
                      : "var(--accent)",
                  opacity: future ? 0 : 1,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
