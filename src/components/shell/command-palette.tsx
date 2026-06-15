"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { FileText, Search, Sheet, CheckSquare, Loader2 } from "lucide-react";
import { globalSearch, fetchTaskForPane, type SearchResult } from "@/actions/global-search";
import { useTaskPane } from "@/components/tasks/task-pane";
import { cn } from "@/lib/utils";

const TYPE_ICON = {
  task: CheckSquare,
  note: FileText,
  sheet: Sheet,
};

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const openTask = useTaskPane();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setActive(0);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(query);
        setResults(res);
        setActive(0);
      });
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  const go = useCallback(
    (r: SearchResult) => {
      onClose();
      if (r.type === "task") {
        // Fetch full task and open the pane directly
        startTransition(async () => {
          const task = await fetchTaskForPane(r.id);
          if (task) openTask(task);
          else router.push("/tasks");
        });
      } else {
        router.push(r.url);
      }
    },
    [onClose, openTask, router, startTransition]
  );

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const r = results[active];
      if (r) go(r);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 pt-[15vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        {/* search bar */}
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          {pending ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search tasks, notes, sheets…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
            ESC
          </kbd>
        </div>

        {/* results */}
        {results.length > 0 && (
          <ul className="max-h-72 overflow-y-auto py-1.5">
            {results.map((r, i) => {
              const Icon = TYPE_ICON[r.type];
              return (
                <li key={r.id}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={() => go(r)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                      i === active ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    {r.type === "note" && r.icon ? (
                      <span className="text-base">{r.icon}</span>
                    ) : (
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">{r.title}</span>
                    <span className="shrink-0 text-xs capitalize text-muted-foreground">
                      {r.type}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {query.trim() && !pending && results.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No results for &ldquo;{query}&rdquo;
          </p>
        )}

        {!query.trim() && (
          <p className="px-4 py-4 text-xs text-muted-foreground">
            Type to search across tasks, notes, and sheets.
          </p>
        )}
      </div>
    </div>
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <Palette onClose={() => setOpen(false)} />,
    document.body
  );
}
