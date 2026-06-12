"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/components/theme-provider";
import { toast } from "sonner";
import "tldraw/tldraw.css";
import { updateNote } from "@/actions/notes";

// tldraw is browser-only + heavy — load on demand
const Tldraw = dynamic(() => import("tldraw").then((m) => m.Tldraw), {
  ssr: false,
  loading: () => (
    <p className="py-16 text-center text-sm text-muted-foreground">
      Loading board…
    </p>
  ),
});

export function NoteCanvas({
  noteId,
  initialCanvas,
}: {
  noteId: string;
  initialCanvas: string;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const { resolvedTheme } = useTheme();

  // onMount must return void — run async setup detached
  const onMount = useCallback(
    (editor: import("tldraw").Editor) => {
      void import("tldraw").then((tldraw) => {
        // restore saved board
        if (initialCanvas) {
          try {
            tldraw.loadSnapshot(editor.store, JSON.parse(initialCanvas));
          } catch {
            // start blank on parse failure rather than wiping silently
          }
        }

        // match app theme
        editor.user.updateUserPreferences({
          colorScheme: resolvedTheme === "dark" ? "dark" : "light",
        });

        // debounced autosave on user document changes
        editor.store.listen(
          () => {
            setSaveState("saving");
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => {
              const snapshot = tldraw.getSnapshot(editor.store);
              updateNote(noteId, { canvas: JSON.stringify(snapshot) })
                .then(() => setSaveState("saved"))
                .catch(() => {
                  toast.error("Board save failed");
                  setSaveState("idle");
                });
            }, 1200);
          },
          { source: "user", scope: "document" }
        );
      });
    },
    [noteId, initialCanvas, resolvedTheme]
  );

  return (
    <div className="relative -mx-3 h-[calc(100dvh-14rem)] md:-mx-8 md:h-[calc(100dvh-12rem)]">
      <span className="absolute right-3 top-2 z-10 rounded bg-background/80 px-1.5 text-[11px] text-muted-foreground backdrop-blur">
        {saveState === "saving"
          ? "Saving…"
          : saveState === "saved"
            ? "Saved ✓"
            : ""}
      </span>
      <Tldraw onMount={onMount} />
    </div>
  );
}
