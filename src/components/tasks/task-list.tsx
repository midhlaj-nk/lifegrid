"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { reorderTasks } from "@/actions/tasks";
import { TaskItem } from "./task-item";
import type { TaskWithMeta } from "@/lib/queries";
import { cn } from "@/lib/utils";

function SortableTaskItem({ task }: { task: TaskWithMeta }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/drag flex items-stretch">
      <button
        {...attributes}
        {...listeners}
        className="hidden cursor-grab items-center px-1 text-muted-foreground/30 hover:text-muted-foreground group-hover/drag:flex touch:flex active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <TaskItem task={task} />
      </div>
    </div>
  );
}

export function TaskList({
  tasks: initialTasks,
  emptyText = "Nothing here. Enjoy the calm.",
}: {
  tasks: TaskWithMeta[];
  emptyText?: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    setTasks((prev) => {
      const prevIds = new Set(prev.map((t) => t.id));
      const nextIds = new Set(initialTasks.map((t) => t.id));
      // If same set of IDs, preserve local order but update task data
      if (
        prev.length === initialTasks.length &&
        [...prevIds].every((id) => nextIds.has(id))
      ) {
        return prev.map((t) => ({ ...t, ...initialTasks.find((it) => it.id === t.id)! }));
      }
      return initialTasks;
    });
  }, [initialTasks]);

  if (!tasks.length) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const newOrder = arrayMove(tasks, oldIndex, newIndex);
    setTasks(newOrder);
    reorderTasks(newOrder.map((t) => t.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {tasks.map((t) => (
            <SortableTaskItem key={t.id} task={t} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function FilterableTaskList({
  tasks,
  tags = [],
  emptyText,
}: {
  tasks: TaskWithMeta[];
  tags?: { id: string; name: string; color: string }[];
  emptyText?: string;
}) {
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const filtered = tasks.filter((t) => {
    if (priorityFilter !== null && t.priority !== priorityFilter) return false;
    if (tagFilter !== null && !t.tags.some((tag) => tag.id === tagFilter)) return false;
    return true;
  });

  const availableTags =
    tags.length > 0
      ? tags
      : Array.from(
          new Map(tasks.flatMap((t) => t.tags).map((tag) => [tag.id, tag])).values()
        );

  return (
    <div className="space-y-3">
      {(tasks.length > 3 || availableTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            {([null, 1, 2, 3] as (number | null)[]).map((p) => (
              <button
                key={p ?? "all"}
                onClick={() => setPriorityFilter(p)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs transition-colors",
                  priorityFilter === p
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {p === null ? "All" : `P${p}`}
              </button>
            ))}
          </div>
          {availableTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs transition-colors",
                    tagFilter === tag.id
                      ? "border-2 bg-accent font-medium"
                      : "border border-border text-muted-foreground hover:bg-accent"
                  )}
                  style={
                    tagFilter === tag.id
                      ? { borderColor: tag.color, color: tag.color }
                      : { color: tag.color }
                  }
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <TaskList tasks={filtered} emptyText={emptyText} />
    </div>
  );
}

export function Section({
  title,
  children,
  count,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  count?: number;
  tone?: "danger";
}) {
  return (
    <section className="space-y-2">
      <h2
        className={
          tone === "danger"
            ? "text-sm font-semibold text-red-500"
            : "text-sm font-semibold text-foreground"
        }
      >
        {title}
        {count !== undefined && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {count}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}
