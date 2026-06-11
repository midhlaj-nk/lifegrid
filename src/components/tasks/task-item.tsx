"use client";

import { useState, useTransition } from "react";
import { format, isPast, isToday, parseISO } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Flag,
  Repeat,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleTaskDone, deleteTask } from "@/actions/tasks";
import { parseRecurrence, describeRecurrence } from "@/lib/recurrence";
import type { TaskWithMeta } from "@/lib/queries";

const PRIORITY_COLOR: Record<number, string> = {
  1: "text-red-500",
  2: "text-amber-500",
  3: "text-blue-500",
};

export function TaskItem({ task }: { task: TaskWithMeta }) {
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const done = task.status === "done";
  const rec = parseRecurrence(task.recurrence);

  const due = task.dueDate ? parseISO(task.dueDate) : null;
  const overdue = due && !done && isPast(due) && !isToday(due);

  return (
    <div className="group">
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50",
          pending && "opacity-50"
        )}
      >
        <button
          onClick={() => startTransition(() => toggleTaskDone(task.id))}
          aria-label={done ? "Mark not done" : "Mark done"}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            done
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-primary"
          )}
        >
          {done && <Check className="h-3 w-3" strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {task.subtasks.length > 0 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-muted-foreground"
                aria-label="Toggle subtasks"
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <span
              className={cn(
                "truncate text-sm",
                done && "text-muted-foreground line-through"
              )}
            >
              {task.title}
            </span>
            {task.priority < 4 && (
              <Flag
                className={cn("h-3.5 w-3.5 shrink-0", PRIORITY_COLOR[task.priority])}
                fill="currentColor"
              />
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {due && (
              <span className={cn(overdue && "font-medium text-red-500")}>
                {format(due, "d MMM")}
                {task.dueTime ? ` ${task.dueTime}` : ""}
              </span>
            )}
            {rec && (
              <span className="inline-flex items-center gap-0.5">
                <Repeat className="h-3 w-3" />
                {describeRecurrence(rec)}
              </span>
            )}
            {task.projectName && (
              <span className="inline-flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: task.projectColor ?? undefined }}
                />
                {task.projectName}
              </span>
            )}
            {task.tags.map((t) => (
              <span key={t.id} style={{ color: t.color }}>
                #{t.name}
              </span>
            ))}
            {task.subtasks.length > 0 && (
              <span>
                {task.subtasks.filter((s) => s.status === "done").length}/
                {task.subtasks.length}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => startTransition(() => deleteTask(task.id))}
          aria-label="Delete task"
          className="mt-1 hidden text-muted-foreground hover:text-red-500 group-hover:block"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && task.subtasks.length > 0 && (
        <div className="ml-9 space-y-0.5 border-l border-border pl-3">
          {task.subtasks.map((s) => (
            <SubtaskRow key={s.id} id={s.id} title={s.title} done={s.status === "done"} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubtaskRow({ id, title, done }: { id: string; title: string; done: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className={cn("flex items-center gap-2 py-1", pending && "opacity-50")}>
      <button
        onClick={() => startTransition(() => toggleTaskDone(id))}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
          done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary"
        )}
        aria-label="Toggle subtask"
      >
        {done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </button>
      <span className={cn("text-sm", done && "text-muted-foreground line-through")}>
        {title}
      </span>
    </div>
  );
}
