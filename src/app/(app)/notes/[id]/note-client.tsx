"use client";

import { useState, useTransition } from "react";
import { Link2, X } from "lucide-react";
import { updateNote, linkNoteToTask, unlinkNoteFromTask } from "@/actions/notes";
import { cn } from "@/lib/utils";

export function NoteHeader({
  noteId,
  initialTitle,
  initialIcon,
}: {
  noteId: string;
  initialTitle: string;
  initialIcon: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState(initialIcon);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          const next = prompt("Page emoji:", icon);
          if (next) {
            setIcon(next);
            updateNote(noteId, { icon: next });
          }
        }}
        className="rounded-md p-1 text-2xl hover:bg-accent"
        aria-label="Change icon"
      >
        {icon}
      </button>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => updateNote(noteId, { title: title.trim() || "Untitled" })}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder="Untitled"
        className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  );
}

interface TaskOption {
  id: string;
  title: string;
  status: string;
}

export function LinkedTasks({
  noteId,
  linked,
  allTasks,
}: {
  noteId: string;
  linked: TaskOption[];
  allTasks: TaskOption[];
}) {
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const linkedIds = new Set(linked.map((t) => t.id));
  const candidates = allTasks
    .filter((t) => !linkedIds.has(t.id))
    .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", pending && "opacity-60")}>
      {linked.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
        >
          <Link2 className="h-3 w-3 text-muted-foreground" />
          <span className={cn(t.status === "done" && "line-through text-muted-foreground")}>
            {t.title}
          </span>
          <button
            onClick={() => startTransition(() => unlinkNoteFromTask(noteId, t.id))}
            className="text-muted-foreground hover:text-red-500"
            aria-label="Unlink task"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {picking ? (
        <div className="relative">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setTimeout(() => setPicking(false), 200)}
            placeholder="Search tasks…"
            className="h-7 w-48 rounded-full border border-border bg-background px-3 text-xs outline-none"
          />
          {candidates.length > 0 && (
            <div className="absolute top-8 z-10 w-64 rounded-md border border-border bg-popover p-1 shadow-md">
              {candidates.map((t) => (
                <button
                  key={t.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setPicking(false);
                    setQuery("");
                    startTransition(() => linkNoteToTask(noteId, t.id));
                  }}
                  className="block w-full truncate rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setPicking(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Link2 className="h-3 w-3" /> Link task
        </button>
      )}
    </div>
  );
}
