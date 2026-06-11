"use client";

import { useState, useTransition } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Check, Link2, Plus, Target, Trash2, Trophy, X } from "lucide-react";
import {
  createGoal,
  deleteGoal,
  updateGoal,
  linkTaskToGoal,
  unlinkTaskFromGoal,
} from "@/actions/goals";
import { cn } from "@/lib/utils";

interface GoalTask {
  id: string;
  title: string;
  status: string;
}

interface GoalRow {
  id: string;
  title: string;
  description: string;
  targetDate: string | null;
  manualProgress: number;
  status: "active" | "achieved" | "dropped";
  tasks: GoalTask[];
}

export function GoalsBoard({
  goals,
  allTasks,
}: {
  goals: GoalRow[];
  allTasks: GoalTask[];
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [pending, startTransition] = useTransition();

  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status !== "active");

  return (
    <div className="space-y-4">
      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            startTransition(async () => {
              await createGoal({
                title: title.trim(),
                targetDate: targetDate || null,
              });
              setTitle("");
              setTargetDate("");
              setAdding(false);
            });
          }}
          className="space-y-3 rounded-lg border border-border bg-card p-4"
        >
          <input
            autoFocus
            placeholder="Goal (emergency fund, learn Rust, 10k run…)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Target date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              disabled={pending || !title.trim()}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Add goal
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
          <Plus className="h-3.5 w-3.5" /> New goal
        </button>
      )}

      {active.length === 0 && !adding && (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No active goals.
        </p>
      )}

      {active.map((g) => (
        <GoalCard key={g.id} goal={g} allTasks={allTasks} />
      ))}

      {done.length > 0 && (
        <details className="pt-2">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Achieved / dropped ({done.length})
          </summary>
          <div className="mt-3 space-y-3 opacity-70">
            {done.map((g) => (
              <GoalCard key={g.id} goal={g} allTasks={allTasks} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function GoalCard({ goal, allTasks }: { goal: GoalRow; allTasks: GoalTask[] }) {
  const [pending, startTransition] = useTransition();
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");

  const doneCount = goal.tasks.filter((t) => t.status === "done").length;
  const progress = goal.tasks.length
    ? Math.round((doneCount / goal.tasks.length) * 100)
    : goal.manualProgress;

  const daysLeft = goal.targetDate
    ? differenceInCalendarDays(parseISO(goal.targetDate), new Date())
    : null;

  const linkedIds = new Set(goal.tasks.map((t) => t.id));
  const candidates = allTasks
    .filter((t) => !linkedIds.has(t.id))
    .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-border bg-card p-4",
        pending && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {goal.status === "achieved" ? (
            <Trophy className="h-4 w-4 text-amber-500" />
          ) : (
            <Target className="h-4 w-4 text-muted-foreground" />
          )}
          <h3 className="text-sm font-semibold">{goal.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {goal.status === "active" && (
            <button
              onClick={() =>
                startTransition(() => updateGoal(goal.id, { status: "achieved" }))
              }
              title="Mark achieved"
              className="rounded p-1 text-muted-foreground hover:text-emerald-500"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (confirm(`Delete goal "${goal.title}"?`))
                startTransition(() => deleteGoal(goal.id));
            }}
            className="rounded p-1 text-muted-foreground hover:text-red-500"
            aria-label="Delete goal"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {goal.tasks.length
              ? `${doneCount}/${goal.tasks.length} tasks`
              : "Manual progress"}
          </span>
          <span className="flex items-center gap-2">
            {daysLeft !== null && (
              <span className={cn(daysLeft < 0 && "text-red-500")}>
                {daysLeft >= 0
                  ? `${daysLeft}d left`
                  : `${-daysLeft}d overdue`}{" "}
                · {format(parseISO(goal.targetDate!), "d MMM yyyy")}
              </span>
            )}
            <span className="font-semibold text-foreground">{progress}%</span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-accent">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        {!goal.tasks.length && goal.status === "active" && (
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={goal.manualProgress}
            onMouseUp={(e) =>
              startTransition(() =>
                updateGoal(goal.id, {
                  manualProgress: Number((e.target as HTMLInputElement).value),
                })
              )
            }
            onTouchEnd={(e) =>
              startTransition(() =>
                updateGoal(goal.id, {
                  manualProgress: Number((e.target as HTMLInputElement).value),
                })
              )
            }
            className="mt-2 w-full"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {goal.tasks.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"
          >
            <span
              className={cn(
                t.status === "done" && "text-muted-foreground line-through"
              )}
            >
              {t.title}
            </span>
            <button
              onClick={() =>
                startTransition(() => unlinkTaskFromGoal(goal.id, t.id))
              }
              className="text-muted-foreground hover:text-red-500"
              aria-label="Unlink"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {goal.status === "active" &&
          (picking ? (
            <div className="relative">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => setTimeout(() => setPicking(false), 200)}
                placeholder="Search tasks…"
                className="h-6 w-40 rounded-full border border-border bg-background px-2.5 text-xs outline-none"
              />
              {candidates.length > 0 && (
                <div className="absolute top-7 z-10 w-60 rounded-md border border-border bg-popover p-1 shadow-md">
                  {candidates.map((t) => (
                    <button
                      key={t.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPicking(false);
                        setQuery("");
                        startTransition(() => linkTaskToGoal(goal.id, t.id));
                      }}
                      className="block w-full truncate rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setPicking(true)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
            >
              <Link2 className="h-3 w-3" /> Link task
            </button>
          ))}
      </div>
    </div>
  );
}
