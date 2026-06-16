"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { format, isPast, isToday, parseISO, addDays } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Flag,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  CalendarArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  toggleTaskDone,
  deleteTask,
  createTask,
  setTaskDueDate,
} from "@/actions/tasks";
import {
  parseRecurrence,
  describeRecurrence,
} from "@/lib/recurrence";
import { useConfirm } from "@/components/ui/app-dialog";
import { useTaskPane } from "@/components/tasks/task-pane";
import type { TaskWithMeta } from "@/lib/queries";

const PRIORITY_COLOR: Record<number, string> = {
  1: "text-red-500",
  2: "text-amber-500",
  3: "text-blue-500",
};

const SWIPE_THRESHOLD = 60;
const SWIPE_COMMIT = 120;

export function TaskItem({ task }: { task: TaskWithMeta }) {
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  const [popped, setPopped] = useState(false);
  // swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStart = useRef<number | null>(null);
  const confirm = useConfirm();
  const openTask = useTaskPane();

  const done = optimisticDone ?? task.status === "done";
  const rec = parseRecurrence(task.recurrence);

  const due = task.dueDate ? parseISO(task.dueDate) : null;
  const overdue = due && !done && isPast(due) && !isToday(due);

  function toggle() {
    setOptimisticDone(!done);
    setPopped(true);
    setTimeout(() => setPopped(false), 350);
    startTransition(async () => {
      await toggleTaskDone(task.id);
      setOptimisticDone(null);
    });
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete "${task.title}"?`,
      description: task.subtasks.length
        ? `Its ${task.subtasks.length} subtask${task.subtasks.length === 1 ? "" : "s"} go too.`
        : undefined,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) startTransition(() => deleteTask(task.id));
  }

  function reschedule(days: number) {
    const base = task.dueDate ? parseISO(task.dueDate) : new Date();
    const next = format(addDays(base, days), "yyyy-MM-dd");
    startTransition(() => setTaskDueDate(task.id, next));
    setSwipeX(0);
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const dx = e.touches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 8) setSwiping(true);
    setSwipeX(Math.max(-160, Math.min(160, dx)));
  }, []);

  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;

  const onTouchEnd = useCallback(() => {
    if (swipeX >= SWIPE_COMMIT) {
      toggleRef.current();
      setSwipeX(0);
    } else if (swipeX <= -SWIPE_COMMIT) {
      setSwipeX(-140);
    } else {
      setSwipeX(0);
    }
    touchStart.current = null;
    setSwiping(false);
  }, [swipeX]);

  const showRightStrip = swipeX > SWIPE_THRESHOLD;

  return (
    <div className="group">
      {/* swipe row wrapper — overflow hidden so strips don't bleed */}
      <div className="relative overflow-hidden rounded-lg">
        {/* right strip — complete (swipe right) */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-start px-4 bg-green-500 transition-opacity",
            showRightStrip ? "opacity-100" : "opacity-0"
          )}
          style={{ width: Math.max(0, swipeX) }}
        >
          <Check className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        {/* left strip — reschedule / delete (swipe left) */}
        <div
          className="absolute inset-y-0 right-0 flex items-stretch"
          style={{ width: Math.max(0, -swipeX) }}
        >
          <button
            onPointerDown={(e) => { e.stopPropagation(); reschedule(1); }}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-blue-500 text-white text-xs font-medium min-w-[70px]"
          >
            <CalendarArrowUp className="h-4 w-4" />
            Tomorrow
          </button>
          <button
            onPointerDown={(e) => { e.stopPropagation(); setSwipeX(0); startTransition(() => deleteTask(task.id)); }}
            className="flex flex-col items-center justify-center gap-0.5 bg-red-500 text-white text-xs font-medium min-w-[70px]"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
        <div
          className="flex items-start gap-2.5 px-2 py-2.5 transition-colors hover:bg-accent/50 bg-background"
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: swiping ? "none" : "transform 0.25s ease",
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={swipeX !== 0 ? (e) => { e.preventDefault(); setSwipeX(0); } : undefined}
        >
        <button
          onClick={toggle}
          aria-label={done ? "Mark not done" : "Mark done"}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors touch:h-6 touch:w-6",
            done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary",
            popped && "checkbox-pop"
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
            <button
              onClick={() => openTask(task)}
              className={cn(
                "truncate text-left text-sm hover:underline",
                done && "text-muted-foreground line-through"
              )}
            >
              {task.title}
            </button>
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
            {task.subtasks.length > 0 && (() => {
              const doneCount = task.subtasks.filter((s) => s.status === "done").length;
              const pct = Math.round((doneCount / task.subtasks.length) * 100);
              return (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span>{doneCount}/{task.subtasks.length}</span>
                </span>
              );
            })()}
          </div>
        </div>

        <div
          className={cn(
            "mt-1 hidden gap-1.5 group-hover:flex touch:flex",
            pending && "flex opacity-50"
          )}
        >
          <button
            onClick={() => {
              setExpanded(true);
              setAddingSubtask(true);
            }}
            aria-label="Add subtask"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground touch:h-9 touch:w-9"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => openTask(task)}
            aria-label="Edit task"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground touch:h-9 touch:w-9"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={remove}
            aria-label="Delete task"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-red-500 touch:h-9 touch:w-9"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        </div>
      </div>

      {(expanded || addingSubtask) && (
        <div className="ml-9 space-y-0.5 border-l border-border pl-3">
          {task.subtasks.map((s) => (
            <SubtaskRow key={s.id} id={s.id} title={s.title} done={s.status === "done"} />
          ))}
          {addingSubtask ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = subtaskTitle.trim();
                if (!v) return setAddingSubtask(false);
                startTransition(async () => {
                  await createTask({
                    title: v,
                    parentId: task.id,
                    projectId: task.projectId,
                  });
                  setSubtaskTitle("");
                });
              }}
            >
              <input
                autoFocus
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                onBlur={() => setAddingSubtask(false)}
                placeholder="Subtask…"
                className="my-1 h-7 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
              />
            </form>
          ) : (
            <button
              onClick={() => setAddingSubtask(true)}
              className="inline-flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Subtask
            </button>
          )}
        </div>
      )}

    </div>
  );
}

function SubtaskRow({ id, title, done: initialDone }: { id: string; title: string; done: boolean }) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const done = optimistic ?? initialDone;
  return (
    <div className="flex items-center gap-2 py-1">
      <button
        onClick={() => {
          setOptimistic(!done);
          startTransition(async () => {
            await toggleTaskDone(id);
            setOptimistic(null);
          });
        }}
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
