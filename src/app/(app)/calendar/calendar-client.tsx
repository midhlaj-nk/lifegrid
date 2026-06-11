"use client";

import { useState, useTransition } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { updateTask, createTask } from "@/actions/tasks";
import { cn } from "@/lib/utils";

interface CalTask {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  priority: number;
}

interface CalEvent {
  id: string;
  title: string;
  icon: string;
  color: string;
  date: string;
}

export function CalendarView({
  tasks,
  events,
}: {
  tasks: CalTask[];
  events: CalEvent[];
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [dragId, setDragId] = useState<string | null>(null);
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const monthStart = startOfMonth(cursor);
  const gridStart =
    view === "month"
      ? startOfWeek(monthStart, { weekStartsOn: 1 })
      : startOfWeek(cursor, { weekStartsOn: 1 });
  const gridEnd =
    view === "month"
      ? endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
      : endOfWeek(cursor, { weekStartsOn: 1 });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const today = new Date();

  function dropOn(dateKey: string) {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    startTransition(() => updateTask(id, { dueDate: dateKey }));
  }

  return (
    <div className={cn(pending && "opacity-70")}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {view === "month"
            ? format(cursor, "MMMM yyyy")
            : `${format(gridStart, "d MMM")} – ${format(gridEnd, "d MMM yyyy")}`}
        </h2>
        <div className="flex items-center gap-1">
          <div className="mr-2 flex rounded-md border border-border p-0.5">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-2 py-0.5 text-xs capitalize",
                  view === v ? "bg-accent font-medium" : "text-muted-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() =>
              setCursor((c) => (view === "month" ? addMonths(c, -1) : addDays(c, -7)))
            }
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="rounded-md px-2 py-1 text-xs hover:bg-accent"
          >
            Today
          </button>
          <button
            onClick={() =>
              setCursor((c) => (view === "month" ? addMonths(c, 1) : addDays(c, 7)))
            }
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="bg-card px-2 py-1.5 text-center font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasks.filter(
            (t) => t.dueDate === key && t.status !== "done"
          );
          const dayEvents = events.filter((e) =>
            isSameDay(parseISO(e.date), day)
          );
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dropOn(key)}
              className={cn(
                "group bg-background p-1.5 align-top",
                view === "week" ? "min-h-48 md:min-h-72" : "min-h-20 md:min-h-28",
                view === "month" && !inMonth && "opacity-40"
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                    isToday && "bg-primary font-semibold text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                <button
                  onClick={() => {
                    setAddingFor(key);
                    setNewTitle("");
                  }}
                  className="hidden rounded p-0.5 text-muted-foreground hover:bg-accent group-hover:block touch:block"
                  aria-label="Add task on this day"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-0.5">
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    className="truncate rounded px-1 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: `${e.color}26`, color: e.color }}
                    title={e.title}
                  >
                    {e.icon} {e.title}
                  </div>
                ))}
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    className={cn(
                      "cursor-grab truncate rounded bg-accent px-1 py-0.5 text-[11px] active:cursor-grabbing",
                      t.priority === 1 && "border-l-2 border-red-500",
                      t.priority === 2 && "border-l-2 border-amber-500"
                    )}
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}
              </div>

              {addingFor === key && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const title = newTitle.trim();
                    if (!title) return setAddingFor(null);
                    startTransition(async () => {
                      await createTask({ title, dueDate: key });
                      setAddingFor(null);
                    });
                  }}
                >
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onBlur={() => setAddingFor(null)}
                    placeholder="Task…"
                    className="mt-1 w-full rounded border border-input bg-background px-1 py-0.5 text-[11px] outline-none"
                  />
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
