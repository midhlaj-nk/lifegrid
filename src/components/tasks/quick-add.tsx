"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarDays, Flag, Plus, Repeat } from "lucide-react";
import { createTask } from "@/actions/tasks";
import { cn } from "@/lib/utils";
import type { Recurrence } from "@/lib/recurrence";

interface QuickAddProps {
  projectId?: string;
  areaId?: string;
  defaultDueDate?: string; // yyyy-MM-dd
  projects?: { id: string; name: string }[];
}

const PRIORITIES = [
  { value: 1, label: "P1", className: "text-red-500" },
  { value: 2, label: "P2", className: "text-amber-500" },
  { value: 3, label: "P3", className: "text-blue-500" },
  { value: 4, label: "None", className: "text-muted-foreground" },
];

const RECURRENCE_PRESETS: { label: string; value: Recurrence | null }[] = [
  { label: "No repeat", value: null },
  { label: "Daily", value: { freq: "daily", interval: 1 } },
  { label: "Weekly", value: { freq: "weekly", interval: 1 } },
  { label: "Weekdays", value: { freq: "weekly", interval: 1, byWeekday: [1, 2, 3, 4, 5] } },
  { label: "Monthly", value: { freq: "monthly", interval: 1 } },
];

export function QuickAdd({ projectId, areaId, defaultDueDate, projects = [] }: QuickAddProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate ?? "");
  const [priority, setPriority] = useState(4);
  const [recurrenceIdx, setRecurrenceIdx] = useState(0);
  const [selectedProject, setSelectedProject] = useState(projectId ?? "");
  const [showOptions, setShowOptions] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const t = title.trim();
    if (!t) return;
    const rec = RECURRENCE_PRESETS[recurrenceIdx].value;
    startTransition(async () => {
      await createTask({
        title: t,
        projectId: selectedProject || projectId || null,
        areaId: areaId ?? null,
        priority,
        dueDate: dueDate || null,
        recurrence: rec ? JSON.stringify(rec) : null,
      });
      setTitle("");
      inputRef.current?.focus();
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2 px-3 py-2"
      >
        <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setShowOptions(true)}
          placeholder="Add a task…"
          className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {title.trim() && (
          <button
            disabled={pending}
            className="shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Add
          </button>
        )}
      </form>

      {showOptions && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
          <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-transparent outline-none"
            />
          </label>

          <div className="flex items-center gap-0.5">
            <Flag className="h-3.5 w-3.5 text-muted-foreground" />
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-xs",
                  p.className,
                  priority === p.value ? "bg-accent font-semibold" : "opacity-60"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Repeat className="h-3.5 w-3.5" />
            <select
              value={recurrenceIdx}
              onChange={(e) => setRecurrenceIdx(Number(e.target.value))}
              className="bg-transparent outline-none"
            >
              {RECURRENCE_PRESETS.map((r, i) => (
                <option key={r.label} value={i}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {projects.length > 0 && !projectId && (
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-transparent text-xs text-muted-foreground outline-none"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
