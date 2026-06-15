"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const SHORTCUTS = [
  { group: "Navigation", items: [
    { keys: ["⌘", "K"], desc: "Search / command palette" },
    { keys: ["Q"], desc: "Quick add task" },
    { keys: ["?"], desc: "Show keyboard shortcuts" },
    { keys: ["Esc"], desc: "Close panel / dialog" },
  ]},
  { group: "Tasks", items: [
    { keys: ["Click title"], desc: "Open task detail pane" },
    { keys: ["Enter"], desc: "Add subtask (in pane)" },
  ]},
  { group: "Notes editor", items: [
    { keys: ["/"], desc: "Slash command menu" },
    { keys: ["⌘", "B"], desc: "Bold" },
    { keys: ["⌘", "I"], desc: "Italic" },
    { keys: ["⌘", "U"], desc: "Underline" },
    { keys: ["⌘", "Z"], desc: "Undo" },
  ]},
];

function Modal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-5">
          {SHORTCUTS.map((g) => (
            <div key={g.group}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.group}
              </p>
              <div className="space-y-1.5">
                {g.items.map((s) => (
                  <div key={s.desc} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{s.desc}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k) => (
                        <kbd key={k} className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-mono">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
          Press <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">?</kbd> to toggle this panel
        </div>
      </div>
    </div>
  );
}

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (
        e.key === "?" &&
        !e.metaKey && !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (!open || typeof document === "undefined") return null;
  return createPortal(<Modal onClose={() => setOpen(false)} />, document.body);
}
