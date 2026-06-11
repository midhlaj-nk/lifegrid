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
import { Flag, Plus } from "lucide-react";
import { setTaskStatus, createTask } from "@/actions/tasks";
import { cn } from "@/lib/utils";

type Status = "todo" | "doing" | "done";

interface BoardTask {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
}

const COLUMNS: { key: Status; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
];

const PRIORITY_COLOR: Record<number, string> = {
  1: "text-red-500",
  2: "text-amber-500",
  3: "text-blue-500",
};

export function KanbanBoard({
  projectId,
  tasks: initial,
}: {
  projectId: string;
  tasks: BoardTask[];
}) {
  const [tasks, setTasks] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const over = e.over?.id as Status | undefined;
    const id = e.active.id as string;
    if (!over) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === over) return;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: over } : t)));
    startTransition(() => setTaskStatus(id, over));
  }

  const active = tasks.find((t) => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <Column
            key={col.key}
            column={col}
            tasks={tasks.filter((t) => t.status === col.key)}
            projectId={projectId}
            onCreated={(t) => setTasks((ts) => [...ts, t])}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? <Card task={active} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  column,
  tasks,
  projectId,
  onCreated,
}: {
  column: { key: Status; label: string };
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
              if (column.key !== "todo") await setTaskStatus(id, column.key);
              onCreated({
                id,
                title: v,
                status: column.key,
                priority: 4,
                dueDate: null,
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
        <span className={cn("flex-1", task.status === "done" && "text-muted-foreground line-through")}>
          {task.title}
        </span>
        {task.priority < 4 && (
          <Flag
            className={cn("mt-0.5 h-3 w-3 shrink-0", PRIORITY_COLOR[task.priority])}
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
