"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import "@excalidraw/excalidraw/index.css";
import { updateNote } from "@/actions/notes";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading canvas…
      </p>
    ),
  }
);

export function NoteCanvas({
  noteId,
  initialCanvas,
}: {
  noteId: string;
  initialCanvas: string;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const { resolvedTheme } = useTheme();

  const initialData = (() => {
    try {
      if (!initialCanvas) return undefined;
      const scene = JSON.parse(initialCanvas);
      return {
        elements: scene.elements ?? [],
        files: scene.files ?? undefined,
        appState: { viewBackgroundColor: scene.viewBackgroundColor },
      };
    } catch {
      return undefined;
    }
  })();

  // Excalidraw fires onChange very frequently — debounce hard
  const onChange = useCallback(
    (
      elements: readonly unknown[],
      appState: { viewBackgroundColor?: string },
      files: unknown
    ) => {
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateNote(noteId, {
          canvas: JSON.stringify({
            elements,
            files,
            viewBackgroundColor: appState.viewBackgroundColor,
          }),
        })
          .then(() => setSaveState("saved"))
          .catch(() => {
            toast.error("Canvas save failed");
            setSaveState("idle");
          });
      }, 1200);
    },
    [noteId]
  );

  return (
    <div className="relative -mx-3 h-[calc(100dvh-14rem)] md:-mx-8 md:h-[calc(100dvh-12rem)]">
      <span className="absolute right-3 top-2 z-10 text-[11px] text-muted-foreground">
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : ""}
      </span>
      <Excalidraw
        initialData={initialData}
        onChange={onChange}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
    </div>
  );
}
