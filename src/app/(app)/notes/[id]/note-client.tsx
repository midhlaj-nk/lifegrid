"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderInput, Link2, PenTool, FileText, X } from "lucide-react";
import { updateNote, linkNoteToTask, unlinkNoteFromTask } from "@/actions/notes";
import { AppModal } from "@/components/ui/app-dialog";
import { cn } from "@/lib/utils";

export function ModeToggle({
  noteId,
  mode,
}: {
  noteId: string;
  mode: "page" | "canvas";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("flex rounded-md border border-border p-0.5", pending && "opacity-50")}>
      {(
        [
          { key: "page", label: "Page", icon: FileText },
          { key: "canvas", label: "Canvas", icon: PenTool },
        ] as const
      ).map((m) => (
        <button
          key={m.key}
          onClick={() =>
            startTransition(async () => {
              await updateNote(noteId, { mode: m.key });
              router.refresh();
            })
          }
          className={cn(
            "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px]",
            mode === m.key ? "bg-accent font-medium" : "text-muted-foreground"
          )}
        >
          <m.icon className="h-3 w-3" />
          {m.label}
        </button>
      ))}
    </div>
  );
}

export function MoveNoteButton({
  noteId,
  allNotes,
}: {
  noteId: string;
  allNotes: { id: string; title: string; icon: string; parentId: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // exclude self and its descendants as move targets
  const blocked = new Set([noteId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of allNotes) {
      if (n.parentId && blocked.has(n.parentId) && !blocked.has(n.id)) {
        blocked.add(n.id);
        grew = true;
      }
    }
  }
  const targets = allNotes.filter((n) => !blocked.has(n.id));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <FolderInput className="h-3 w-3" /> Move
      </button>
      <AppModal open={open} onClose={() => setOpen(false)} title="Move page to…">
        <div className={cn("max-h-72 space-y-0.5 overflow-y-auto", pending && "opacity-50")}>
          <button
            onClick={() =>
              startTransition(async () => {
                await updateNote(noteId, { parentId: null });
                setOpen(false);
                router.refresh();
              })
            }
            className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            ⬆️ Top level
          </button>
          {targets.map((n) => (
            <button
              key={n.id}
              onClick={() =>
                startTransition(async () => {
                  await updateNote(noteId, { parentId: n.id });
                  setOpen(false);
                  router.refresh();
                })
              }
              className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              {n.icon} {n.title}
            </button>
          ))}
        </div>
      </AppModal>
    </>
  );
}

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
  const [pickingIcon, setPickingIcon] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setPickingIcon((v) => !v)}
          className="rounded-md p-1 text-2xl hover:bg-accent"
          aria-label="Change icon"
        >
          {icon}
        </button>
        {pickingIcon && (
          <div className="absolute top-11 z-10 grid w-44 grid-cols-6 gap-1 rounded-md border border-border bg-popover p-2 shadow-md">
            {["📄","📝","💡","📌","📚","🧠","💼","🏠","💰","🛠️","🎯","🗂️","🧪","🌱","✈️","❤️","⭐","🔥"].map((e) => (
              <button
                key={e}
                onClick={() => {
                  setIcon(e);
                  setPickingIcon(false);
                  updateNote(noteId, { icon: e });
                }}
                className="rounded p-1 text-lg hover:bg-accent"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
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
