"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { CalendarPlus, Repeat, Trash2 } from "lucide-react";
import { createEvent, deleteEvent } from "@/actions/events";
import { countdownLabel } from "@/lib/events";
import { cn } from "@/lib/utils";

const COLORS = ["#f59e0b", "#ef4444", "#10b981", "#6366f1", "#ec4899", "#06b6d4"];

export function CreateEventForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [yearly, setYearly] = useState(false);
  const [icon, setIcon] = useState("🎉");
  const [color, setColor] = useState(COLORS[0]);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <CalendarPlus className="h-3.5 w-3.5" /> New event
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !date) return;
        startTransition(async () => {
          await createEvent({ title: title.trim(), date, yearlyRecurring: yearly, icon, color });
          setTitle("");
          setDate("");
          setYearly(false);
          setOpen(false);
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
          placeholder="Event name (birthday, exam, trip…)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none"
        />
        <label className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={yearly}
            onChange={(e) => setYearly(e.target.checked)}
            className="h-4 w-4"
          />
          <Repeat className="h-3.5 w-3.5" /> Repeats yearly
        </label>
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn("h-5 w-5 rounded-full", color === c && "ring-2 ring-offset-2 ring-offset-background")}
              style={{ backgroundColor: c, ["--tw-ring-color" as string]: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          disabled={pending || !title.trim() || !date}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Add event
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 rounded-md border border-border px-4 text-sm hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface EventRow {
  id: string;
  title: string;
  icon: string;
  color: string;
  yearlyRecurring: boolean;
  nextDate: string;
  days: number;
}

export function EventList({ events }: { events: EventRow[] }) {
  const [pending, startTransition] = useTransition();

  if (!events.length) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No events yet. Add birthdays, deadlines, trips.
      </p>
    );
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", pending && "opacity-60")}>
      {events.map((e) => (
        <div
          key={e.id}
          className="group relative flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-card p-4"
        >
          <span
            className="absolute inset-y-0 left-0 w-1"
            style={{ backgroundColor: e.color }}
          />
          <span className="text-2xl">{e.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{e.title}</p>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(e.nextDate), "EEE, d MMM yyyy")}
              {e.yearlyRecurring && " · yearly"}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
              e.days === 0
                ? "bg-red-500/15 text-red-500"
                : e.days <= 7
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-accent text-muted-foreground"
            )}
          >
            {countdownLabel(e.days)}
          </span>
          <button
            onClick={() => startTransition(() => deleteEvent(e.id))}
            className="hidden text-muted-foreground hover:text-red-500 group-hover:block"
            aria-label="Delete event"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
