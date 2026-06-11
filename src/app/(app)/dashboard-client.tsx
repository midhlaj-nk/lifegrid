"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  X,
} from "lucide-react";
import { toggleTaskDone } from "@/actions/tasks";
import { toggleHabitCheck } from "@/actions/habits";
import { saveDashboardPrefs } from "@/actions/dashboard";
import { countdownLabel } from "@/lib/events";
import type { TaskWithMeta } from "@/lib/queries";
import { cn } from "@/lib/utils";

export interface WidgetPrefRow {
  key: string;
  enabled: boolean;
}

export const DEFAULT_WIDGETS: WidgetPrefRow[] = [
  { key: "today", enabled: true },
  { key: "countdowns", enabled: true },
  { key: "habits", enabled: true },
  { key: "upcoming", enabled: true },
  { key: "goals", enabled: true },
  { key: "notes", enabled: true },
];

const WIDGET_LABELS: Record<string, string> = {
  today: "Today's tasks",
  countdowns: "Countdowns",
  habits: "Habits",
  upcoming: "Upcoming",
  goals: "Goals",
  notes: "Recent notes",
};

export interface WidgetData {
  today: string;
  overdue: TaskWithMeta[];
  dueToday: TaskWithMeta[];
  upcoming: TaskWithMeta[];
  countdowns: {
    id: string;
    title: string;
    icon: string;
    color: string;
    days: number;
    date: string;
  }[];
  habits: {
    id: string;
    name: string;
    icon: string;
    color: string;
    weekdays: number[];
    checkedToday: boolean;
  }[];
  goals: {
    id: string;
    title: string;
    progress: number;
    targetDate: string | null;
  }[];
  recentNotes: { id: string; title: string; icon: string }[];
}

export function Dashboard({
  userName,
  data,
  prefs: initialPrefs,
}: {
  userName: string;
  data: WidgetData;
  prefs: WidgetPrefRow[];
}) {
  // merge in any new widget keys not yet saved
  const merged = [
    ...initialPrefs,
    ...DEFAULT_WIDGETS.filter(
      (d) => !initialPrefs.some((p) => p.key === d.key)
    ),
  ];
  const [prefs, setPrefs] = useState(merged);
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  function move(idx: number, dir: -1 | 1) {
    setPrefs((p) => {
      const next = [...p];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return p;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {greeting}, {userName.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>
        <button
          onClick={() => {
            if (editing) startTransition(() => saveDashboardPrefs(prefs));
            setEditing((v) => !v);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs",
            editing
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-accent"
          )}
        >
          {editing ? (
            <>
              <Check className="h-3.5 w-3.5" /> Done
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </>
          )}
        </button>
      </header>

      {editing && (
        <div className="space-y-1 rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Arrange widgets
          </p>
          {prefs.map((p, i) => (
            <div key={p.key} className="flex items-center gap-2 text-sm">
              <button
                onClick={() =>
                  setPrefs((ps) =>
                    ps.map((x) =>
                      x.key === p.key ? { ...x, enabled: !x.enabled } : x
                    )
                  )
                }
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border",
                  p.enabled
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40"
                )}
                aria-label="Toggle widget"
              >
                {p.enabled && <Check className="h-3 w-3" strokeWidth={3} />}
              </button>
              <span className="flex-1">{WIDGET_LABELS[p.key] ?? p.key}</span>
              <button onClick={() => move(i, -1)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Move up">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => move(i, 1)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Move down">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {prefs
          .filter((p) => p.enabled)
          .map((p) => (
            <Widget key={p.key} type={p.key} data={data} />
          ))}
      </div>
    </div>
  );
}

function Card({
  title,
  href,
  children,
  span,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        span && "lg:col-span-2"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Link href={href} className="text-xs text-muted-foreground hover:text-foreground">
          View all →
        </Link>
      </div>
      {children}
    </section>
  );
}

function TaskRow({ task }: { task: TaskWithMeta }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className={cn("flex items-center gap-2 py-1", pending && "opacity-50")}>
      <button
        onClick={() => startTransition(() => toggleTaskDone(task.id))}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 hover:border-primary"
        aria-label="Complete task"
      />
      <span className="flex-1 truncate text-sm">{task.title}</span>
      {task.dueDate && (
        <span className="text-[11px] text-muted-foreground">
          {format(parseISO(task.dueDate), "d MMM")}
        </span>
      )}
    </div>
  );
}

function Widget({ type, data }: { type: string; data: WidgetData }) {
  const [, startTransition] = useTransition();

  switch (type) {
    case "today": {
      const items = [...data.overdue, ...data.dueToday];
      return (
        <Card title="Today's tasks" href="/today">
          {items.length ? (
            items.slice(0, 8).map((t) => <TaskRow key={t.id} task={t} />)
          ) : (
            <p className="text-sm text-muted-foreground">All clear today.</p>
          )}
          {data.overdue.length > 0 && (
            <p className="mt-2 text-[11px] font-medium text-red-500">
              {data.overdue.length} overdue
            </p>
          )}
        </Card>
      );
    }
    case "countdowns":
      return (
        <Card title="Countdowns" href="/events">
          {data.countdowns.length ? (
            <div className="space-y-1.5">
              {data.countdowns.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <span>{e.icon}</span>
                  <span className="flex-1 truncate">{e.title}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                      e.days === 0
                        ? "bg-red-500/15 text-red-500"
                        : e.days <= 7
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-accent text-muted-foreground"
                    )}
                  >
                    {countdownLabel(e.days)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming events.</p>
          )}
        </Card>
      );
    case "habits": {
      const todayDow = new Date().getDay();
      const due = data.habits.filter(
        (h) => !h.weekdays.length || h.weekdays.includes(todayDow)
      );
      return (
        <Card title="Habits today" href="/habits">
          {due.length ? (
            <div className="space-y-1.5">
              {due.map((h) => (
                <button
                  key={h.id}
                  onClick={() =>
                    startTransition(() => toggleHabitCheck(h.id, data.today))
                  }
                  className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border-2",
                      h.checkedToday ? "text-white" : "border-muted-foreground/40"
                    )}
                    style={
                      h.checkedToday
                        ? { backgroundColor: h.color, borderColor: h.color }
                        : undefined
                    }
                  >
                    {h.checkedToday && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                  <span>{h.icon}</span>
                  <span className={cn(h.checkedToday && "text-muted-foreground line-through")}>
                    {h.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No habits scheduled today.</p>
          )}
        </Card>
      );
    }
    case "upcoming":
      return (
        <Card title="Upcoming" href="/upcoming">
          {data.upcoming.length ? (
            data.upcoming.map((t) => <TaskRow key={t.id} task={t} />)
          ) : (
            <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
          )}
        </Card>
      );
    case "goals":
      return (
        <Card title="Goals" href="/goals">
          {data.goals.length ? (
            <div className="space-y-2.5">
              {data.goals.slice(0, 5).map((g) => (
                <div key={g.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="truncate">{g.title}</span>
                    <span className="text-xs text-muted-foreground">{g.progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active goals.</p>
          )}
        </Card>
      );
    case "notes":
      return (
        <Card title="Recent notes" href="/notes">
          {data.recentNotes.length ? (
            <div className="space-y-1">
              {data.recentNotes.map((n) => (
                <Link
                  key={n.id}
                  href={`/notes/${n.id}`}
                  className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent"
                >
                  <span>{n.icon}</span>
                  <span className="truncate">{n.title}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
        </Card>
      );
    default:
      return null;
  }
}
