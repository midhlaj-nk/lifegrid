"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, FileText, Flag, Plus, Trash2 } from "lucide-react";
import { SidePane } from "@/components/ui/side-pane";
import { useConfirm } from "@/components/ui/app-dialog";
import {
  updateTask,
  deleteTask,
  toggleTaskDone,
  createTask,
} from "@/actions/tasks";
import { createTag } from "@/actions/organize";
import { getLinkedNotes } from "@/actions/notes";
import {
  parseRecurrence,
  type Recurrence,
} from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import type { TaskWithMeta, TaskRow } from "@/lib/queries";

type TagItem = { id: string; name: string; color: string };
type ProjectItem = { id: string; name: string; color: string; areaId: string | null };
type AreaItem = { id: string; name: string; color: string };

const RECURRENCE_PRESETS: { label: string; value: Recurrence | null }[] = [
  { label: "No repeat", value: null },
  { label: "Daily", value: { freq: "daily", interval: 1 } },
  { label: "Weekly", value: { freq: "weekly", interval: 1 } },
  { label: "Weekdays", value: { freq: "weekly", interval: 1, byWeekday: [1, 2, 3, 4, 5] } },
  { label: "Monthly", value: { freq: "monthly", interval: 1 } },
];

type OpenTask = (task: TaskWithMeta) => void;

const TaskPaneContext = createContext<OpenTask>(() => {});

/** Open the task detail pane for a given task from anywhere in the app. */
export function useTaskPane() {
  return useContext(TaskPaneContext);
}

export function TaskPaneProvider({
  tags,
  projects,
  areas,
  children,
}: {
  tags: TagItem[];
  projects: ProjectItem[];
  areas: AreaItem[];
  children: React.ReactNode;
}) {
  const [task, setTask] = useState<TaskWithMeta | null>(null);

  const open = useCallback<OpenTask>((t) => setTask(t), []);

  return (
    <TaskPaneContext.Provider value={open}>
      {children}
      <SidePane
        open={!!task}
        onClose={() => setTask(null)}
        title="Task"
      >
        {task && (
          <TaskDetail
            // remount on task change so internal state resets cleanly
            key={task.id}
            task={task}
            tags={tags}
            projects={projects}
            areas={areas}
            onClose={() => setTask(null)}
          />
        )}
      </SidePane>
    </TaskPaneContext.Provider>
  );
}

function TaskDetail({
  task,
  tags,
  projects,
  areas,
  onClose,
}: {
  task: TaskWithMeta;
  tags: TagItem[];
  projects: ProjectItem[];
  areas: AreaItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [dueTime, setDueTime] = useState(task.dueTime ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [projectId, setProjectId] = useState(task.projectId ?? "");
  const [areaId, setAreaId] = useState(task.areaId ?? "");
  const [tagIds, setTagIds] = useState<string[]>(task.tags.map((t) => t.id));
  const [newTag, setNewTag] = useState("");
  const [subtasks, setSubtasks] = useState<TaskRow[]>(task.subtasks);
  const [newSubtask, setNewSubtask] = useState("");
  const [done, setDone] = useState(task.status === "done");
  const [linkedNotes, setLinkedNotes] = useState<{ id: string; title: string; icon: string }[]>([]);

  useEffect(() => {
    getLinkedNotes(task.id).then(setLinkedNotes).catch(() => {});
  }, [task.id]);

  const initialRec = parseRecurrence(task.recurrence);
  const [recIdx, setRecIdx] = useState(() => {
    if (!initialRec) return 0;
    const i = RECURRENCE_PRESETS.findIndex(
      (p) => JSON.stringify(p.value) === JSON.stringify(initialRec)
    );
    return i === -1 ? 0 : i;
  });

  // Debounced autosave of the scalar fields — Notion-like (no Save button).
  useEffect(() => {
    const t = setTimeout(() => {
      if (!title.trim()) return;
      const rec = RECURRENCE_PRESETS[recIdx].value;
      updateTask(task.id, {
        title: title.trim(),
        note,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        priority,
        projectId: projectId || null,
        areaId: areaId || null,
        recurrence: rec ? JSON.stringify(rec) : null,
        tagIds,
      }).then(() => router.refresh());
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, note, dueDate, dueTime, priority, projectId, areaId, recIdx, tagIds]);

  function addNewTag() {
    const v = newTag.trim();
    if (!v) return;
    setNewTag("");
    startTransition(async () => {
      const id = await createTag({ name: v });
      setTagIds((cur) => [...cur, id]);
      router.refresh();
    });
  }

  function toggleTag(id: string) {
    setTagIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  function addSubtask() {
    const v = newSubtask.trim();
    if (!v) return;
    setNewSubtask("");
    startTransition(async () => {
      const id = await createTask({
        title: v,
        parentId: task.id,
        projectId: task.projectId,
      });
      setSubtasks((s) => [
        ...s,
        { ...(task as unknown as TaskRow), id, title: v, status: "todo", parentId: task.id } as TaskRow,
      ]);
      router.refresh();
    });
  }

  function toggleSubtask(id: string) {
    setSubtasks((s) =>
      s.map((x) =>
        x.id === id ? { ...x, status: x.status === "done" ? "todo" : "done" } : x
      )
    );
    startTransition(async () => {
      await toggleTaskDone(id);
      router.refresh();
    });
  }

  async function removeTask() {
    const ok = await confirm({
      title: `Delete "${task.title}"?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteTask(task.id);
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="space-y-5">
      {/* title row with complete toggle */}
      <div className="flex items-start gap-2.5">
        <button
          onClick={() => {
            setDone((d) => !d);
            startTransition(async () => {
              await toggleTaskDone(task.id);
              router.refresh();
            });
          }}
          aria-label={done ? "Mark not done" : "Mark done"}
          className={cn(
            "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            done
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-primary"
          )}
        >
          {done && <Check className="h-3 w-3" strokeWidth={3} />}
        </button>
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={1}
          placeholder="Task title"
          className={cn(
            "min-h-8 flex-1 resize-none bg-transparent text-lg font-semibold outline-none",
            done && "text-muted-foreground line-through"
          )}
        />
      </div>

      {/* properties */}
      <div className="space-y-3 text-sm">
        <Field label="Due">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 outline-none"
          />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 outline-none"
          />
        </Field>

        <Field label="Project">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 outline-none"
          >
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Area">
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 outline-none"
          >
            <option value="">None</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Priority">
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 outline-none"
          >
            <option value={1}>P1 — urgent</option>
            <option value={2}>P2 — high</option>
            <option value={3}>P3 — medium</option>
            <option value={4}>No priority</option>
          </select>
          {priority < 4 && (
            <Flag
              className={cn(
                "h-4 w-4",
                priority === 1 && "text-red-500",
                priority === 2 && "text-amber-500",
                priority === 3 && "text-blue-500"
              )}
              fill="currentColor"
            />
          )}
        </Field>

        <Field label="Repeat">
          <select
            value={recIdx}
            onChange={(e) => setRecIdx(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 outline-none"
          >
            {RECURRENCE_PRESETS.map((r, i) => (
              <option key={r.label} value={i}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tags">
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((t) => {
              const on = tagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs transition-colors",
                    on
                      ? "border-transparent text-white"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                  style={on ? { backgroundColor: t.color } : undefined}
                >
                  #{t.name}
                </button>
              );
            })}
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNewTag();
                }
              }}
              placeholder="+ tag"
              className="h-6 w-16 rounded-full border border-dashed border-border bg-transparent px-2 text-xs outline-none focus:w-24"
            />
          </div>
        </Field>
      </div>

      {/* description */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Notes
        </p>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            // auto-resize
            const el = e.target;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }}
          onFocus={(e) => {
            const el = e.target;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }}
          placeholder="Add details…"
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* subtasks */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Subtasks
        </p>
        <div className="space-y-1">
          {subtasks.map((s) => {
            const sdone = s.status === "done";
            return (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => toggleSubtask(s.id)}
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                    sdone
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 hover:border-primary"
                  )}
                  aria-label="Toggle subtask"
                >
                  {sdone && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                </button>
                <span className={cn("text-sm", sdone && "text-muted-foreground line-through")}>
                  {s.title}
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 pt-1">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubtask();
                }
              }}
              placeholder="Add subtask…"
              className="h-7 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
      </div>

      {/* linked notes (backlinks) */}
      {linkedNotes.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Linked notes
          </p>
          <div className="space-y-1">
            {linkedNotes.map((n) => (
              <Link
                key={n.id}
                href={`/notes/${n.id}`}
                onClick={onClose}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span className="shrink-0">{n.icon || <FileText className="h-3.5 w-3.5 text-muted-foreground" />}</span>
                <span className="truncate">{n.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* danger */}
      <div className="border-t border-border pt-3">
        <button
          onClick={removeTask}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete task
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
