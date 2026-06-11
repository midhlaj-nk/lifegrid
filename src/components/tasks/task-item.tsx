"use client";

import { useState, useTransition } from "react";
import { format, isPast, isToday, parseISO } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Flag,
  Pencil,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  toggleTaskDone,
  deleteTask,
  updateTask,
  createTask,
} from "@/actions/tasks";
import {
  parseRecurrence,
  describeRecurrence,
  type Recurrence,
} from "@/lib/recurrence";
import { useConfirm, AppModal } from "@/components/ui/app-dialog";
import type { TaskWithMeta } from "@/lib/queries";

const PRIORITY_COLOR: Record<number, string> = {
  1: "text-red-500",
  2: "text-amber-500",
  3: "text-blue-500",
};

const RECURRENCE_PRESETS: { label: string; value: Recurrence | null }[] = [
  { label: "No repeat", value: null },
  { label: "Daily", value: { freq: "daily", interval: 1 } },
  { label: "Weekly", value: { freq: "weekly", interval: 1 } },
  { label: "Weekdays", value: { freq: "weekly", interval: 1, byWeekday: [1, 2, 3, 4, 5] } },
  { label: "Monthly", value: { freq: "monthly", interval: 1 } },
];

export function TaskItem({ task }: { task: TaskWithMeta }) {
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  // optimistic done state — flips instantly, server catches up
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  const confirm = useConfirm();

  const done = optimisticDone ?? task.status === "done";
  const rec = parseRecurrence(task.recurrence);

  const due = task.dueDate ? parseISO(task.dueDate) : null;
  const overdue = due && !done && isPast(due) && !isToday(due);

  function toggle() {
    setOptimisticDone(!done);
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

  return (
    <div className="group">
      <div className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
        <button
          onClick={toggle}
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
            <button
              onClick={() => setEditing(true)}
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
            {task.subtasks.length > 0 && (
              <span>
                {task.subtasks.filter((s) => s.status === "done").length}/
                {task.subtasks.length}
              </span>
            )}
          </div>
        </div>

        <div
          className={cn(
            "mt-1 hidden gap-1 group-hover:flex touch:flex",
            pending && "flex opacity-50"
          )}
        >
          <button
            onClick={() => {
              setExpanded(true);
              setAddingSubtask(true);
            }}
            aria-label="Add subtask"
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit task"
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={remove}
            aria-label="Delete task"
            className="text-muted-foreground hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
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

      {editing && <EditTaskDialog task={task} onClose={() => setEditing(false)} />}
    </div>
  );
}

function EditTaskDialog({
  task,
  onClose,
}: {
  task: TaskWithMeta;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [dueTime, setDueTime] = useState(task.dueTime ?? "");
  const [priority, setPriority] = useState(task.priority);
  const initialRec = parseRecurrence(task.recurrence);
  const [recIdx, setRecIdx] = useState(() => {
    if (!initialRec) return 0;
    const idx = RECURRENCE_PRESETS.findIndex(
      (p) => JSON.stringify(p.value) === JSON.stringify(initialRec)
    );
    return idx === -1 ? 0 : idx;
  });
  const [pending, startTransition] = useTransition();

  return (
    <AppModal open onClose={onClose} title="Edit task" wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          const rec = RECURRENCE_PRESETS[recIdx].value;
          startTransition(async () => {
            await updateTask(task.id, {
              title: title.trim(),
              note,
              dueDate: dueDate || null,
              dueTime: dueTime || null,
              priority,
              recurrence: rec ? JSON.stringify(rec) : null,
            });
            onClose();
          });
        }}
        className="space-y-3"
      >
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notes…"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
          />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
          >
            <option value={1}>P1 — urgent</option>
            <option value={2}>P2 — high</option>
            <option value={3}>P3 — medium</option>
            <option value={4}>No priority</option>
          </select>
          <select
            value={recIdx}
            onChange={(e) => setRecIdx(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
          >
            {RECURRENCE_PRESETS.map((r, i) => (
              <option key={r.label} value={i}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-border px-4 text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            disabled={pending || !title.trim()}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </AppModal>
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
