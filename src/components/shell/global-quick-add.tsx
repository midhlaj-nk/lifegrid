"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Flag, Hash, Repeat, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { quickAddTask } from "@/actions/quick-add";
import { parseQuickAdd } from "@/lib/nl-parse";
import { describeRecurrence } from "@/lib/recurrence";
import { cn } from "@/lib/utils";

export function GlobalQuickAdd() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // q / Q — quick add (when not typing in an input/textarea/contenteditable)
      if (
        (e.key === "q" || e.key === "Q") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const preview = useMemo(
    () => (text.trim() ? parseQuickAdd(text) : null),
    [text]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-popover p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            startTransition(async () => {
              const r = await quickAddTask(text);
              if (r.ok) {
                setText("");
                setOpen(false);
              }
            });
          }}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 shrink-0 text-amber-500" />
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='Try: "pay rent tomorrow 6pm #personal !high every month"'
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          {preview && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
              <span className="font-medium">{preview.title || "…"}</span>
              {preview.dueDate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {preview.dueDate}
                  {preview.dueTime && ` ${preview.dueTime}`}
                </span>
              )}
              {preview.priority < 4 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5",
                    preview.priority === 1 && "text-red-500",
                    preview.priority === 2 && "text-amber-500",
                    preview.priority === 3 && "text-blue-500"
                  )}
                >
                  <Flag className="h-3 w-3" /> P{preview.priority}
                </span>
              )}
              {preview.recurrence && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-muted-foreground">
                  <Repeat className="h-3 w-3" />
                  {describeRecurrence(preview.recurrence)}
                </span>
              )}
              {preview.tagNames.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-emerald-600 dark:text-emerald-400"
                >
                  <Hash className="h-3 w-3" />
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Q to toggle · Enter to add
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={aiBusy || !text.trim()}
                onClick={async () => {
                  setAiBusy(true);
                  try {
                    const res = await fetch("/api/ai/capture", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ text }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "AI capture failed");
                    toast.success(`Created ${data.created}: ${data.item.title}`);
                    setText("");
                    setOpen(false);
                    router.refresh();
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setAiBusy(false);
                  }
                }}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
                title="AI decides: task, expense, or event"
              >
                <Sparkles className="h-3 w-3" />
                {aiBusy ? "Parsing…" : "AI capture"}
              </button>
              <button
                disabled={pending || !text.trim()}
                className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                Add task
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
