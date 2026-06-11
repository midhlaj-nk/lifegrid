"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { format, parseISO } from "date-fns";
import { Flag, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { setTaskKanbanColumn, createTask } from "@/actions/tasks";
import { updateProject } from "@/actions/organize";
import { taskColumn, type KanbanColumn } from "@/lib/kanban";
import { useConfirm, AppModal } from "@/components/ui/app-dialog";
import { cn } from "@/lib/utils";

interface BoardTask {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  kanbanColumn: string | null;
}

const PRIORITY_COLOR: Record<number, string> = {
  1: "text-red-500",
  2: "text-amber-500",
  3: "text-blue-500",
};

export function KanbanBoard({
  projectId,
  columns: initialColumns,
  tasks: initial,
}: {
  projectId: string;
  columns: KanbanColumn[];
  tasks: BoardTask[];
}) {
  const [columns, setColumns] = useState(initialColumns);
  const [tasks, setTasks] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingColumns, setEditingColumns] = useState(false);
  const [, startTransition] = useTransition();
  const confirm = useConfirm();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  function persistColumns(next: KanbanColumn[]) {
    setColumns(next);
    startTransition(() =>
      updateProject(projectId, { kanbanColumns: JSON.stringify(next) })
    );
  }

  function addColumn(label: string) {
    const key = `col-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${columns.length}`;
    const done = columns.find((c) => c.key === "done")!;
    persistColumns([
      ...columns.filter((c) => c.key !== "done"),
      { key, label },
      done,
    ]);
  }

  function renameColumn(key: string, label: string) {
    persistColumns(columns.map((c) => (c.key === key ? { ...c, label } : c)));
  }

  async function removeColumn(key: string) {
    if (key === "done") return; // done column is structural
    const count = tasks.filter((t) => taskColumn(t, columns) === key).length;
    const ok = await confirm({
      title: `Remove stage?`,
      description: count
        ? `${count} task${count === 1 ? "" : "s"} move back to "${columns[0].label}".`
        : undefined,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    const fallback = columns[0].key === key ? columns[1]?.key : columns[0].key;
    // move that stage's tasks to fallback column
    for (const t of tasks.filter((x) => taskColumn(x, columns) === key)) {
      startTransition(() => setTaskKanbanColumn(t.id, fallback));
    }
    setTasks((ts) =>
      ts.map((t) =>
        taskColumn(t, columns) === key ? { ...t, kanbanColumn: fallback } : t
      )
    );
    persistColumns(columns.filter((c) => c.key !== key));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const over = e.over?.id as string | undefined;
    const id = e.active.id as string;
    if (!over) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || taskColumn(task, columns) === over) return;
    setTasks((ts) =>
      ts.map((t) =>
        t.id === id
          ? {
              ...t,
              kanbanColumn: over === "done" ? null : over,
              status: over === "done" ? "done" : "todo",
            }
          : t
      )
    );
    startTransition(() => setTaskKanbanColumn(id, over));
  }

  const active = tasks.find((t) => t.id === activeId);

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setEditingColumns(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          <Pencil className="h-3 w-3" /> Edit stages
        </button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 220px), 1fr))`,
          }}
        >
          {columns.map((col) => (
            <Column
              key={col.key}
              column={col}
              tasks={tasks.filter((t) => taskColumn(t, columns) === col.key)}
              projectId={projectId}
              onCreated={(t) => setTasks((ts) => [...ts, t])}
            />
          ))}
        </div>
        <DragOverlay>{active ? <Card task={active} overlay /> : null}</DragOverlay>
      </DndContext>

      <ColumnEditor
        open={editingColumns}
        onClose={() => setEditingColumns(false)}
        columns={columns}
        onAdd={addColumn}
        onRename={renameColumn}
        onRemove={removeColumn}
      />
    </>
  );
}

function ColumnEditor({
  open,
  onClose,
  columns,
  onAdd,
  onRename,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  columns: KanbanColumn[];
  onAdd: (label: string) => void;
  onRename: (key: string, label: string) => void;
  onRemove: (key: string) => void;
}) {
  const [newLabel, setNewLabel] = useState("");

  return (
    <AppModal open={open} onClose={onClose} title="Board stages">
      <div className="space-y-2">
        {columns.map((c) => (
          <div key={c.key} className="flex items-center gap-2">
            <input
              defaultValue={c.label}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== c.label) onRename(c.key, v);
              }}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none"
            />
            {c.key === "done" ? (
              <span className="px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                completes
              </span>
            ) : (
              <button
                onClick={() => onRemove(c.key)}
                className="rounded p-1.5 text-muted-foreground hover:text-red-500"
                aria-label={`Remove ${c.label}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = newLabel.trim();
            if (!v) return;
            if (columns.length >= 7) {
              toast.error("Max 7 stages");
              return;
            }
            onAdd(v);
            setNewLabel("");
          }}
          className="flex gap-2 pt-1"
        >
          <input
            placeholder="New stage (Review, Testing…)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none"
          />
          <button
            disabled={!newLabel.trim()}
            className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </form>

        <p className="pt-1 text-[11px] text-muted-foreground">
          Dropping a card into the last stage marks it done. Tasks in a removed
          stage move to the first stage.
        </p>

        <button
          onClick={onClose}
          className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1 rounded-md border border-border text-sm hover:bg-accent"
        >
          <X className="h-3.5 w-3.5" /> Close
        </button>
      </div>
    </AppModal>
  );
}

function Column({
  column,
  tasks,
  projectId,
  onCreated,
}: {
  column: KanbanColumn;
  tasks: BoardTask[];
  projectId: string;
  onCreated: (t: BoardTask) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.key });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-40 flex-col rounded-lg border border-border bg-card/50 p-2 transition-colors",
        isOver && "border-primary/50 bg-accent/50"
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {column.label}
        </span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex-1 space-y-2">
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} />
        ))}
      </div>
      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = title.trim();
            if (!v) return setAdding(false);
            startTransition(async () => {
              const id = await createTask({ title: v, projectId });
              if (column.key !== "todo")
                await setTaskKanbanColumn(id, column.key);
              onCreated({
                id,
                title: v,
                status: column.key === "done" ? "done" : "todo",
                priority: 4,
                dueDate: null,
                kanbanColumn: column.key === "done" ? null : column.key,
              });
              setTitle("");
              setAdding(false);
            });
          }}
          className="mt-2"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setAdding(false)}
            disabled={pending}
            placeholder="Task title…"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none"
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      )}
    </div>
  );
}

function DraggableCard({ task }: { task: BoardTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
          : undefined
      }
      className={cn(isDragging && "opacity-40")}
    >
      <Card task={task} />
    </div>
  );
}

function Card({ task, overlay }: { task: BoardTask; overlay?: boolean }) {
  return (
    <div
      className={cn(
        "cursor-grab rounded-md border border-border bg-background p-2.5 text-sm shadow-sm active:cursor-grabbing",
        overlay && "rotate-2 shadow-lg"
      )}
    >
      <div className="flex items-start gap-1.5">
        <span
          className={cn(
            "flex-1",
            task.status === "done" && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </span>
        {task.priority < 4 && (
          <Flag
            className={cn(
              "mt-0.5 h-3 w-3 shrink-0",
              PRIORITY_COLOR[task.priority]
            )}
            fill="currentColor"
          />
        )}
      </div>
      {task.dueDate && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {format(parseISO(task.dueDate), "d MMM")}
        </p>
      )}
    </div>
  );
}
