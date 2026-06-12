"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileText, Loader2, PenTool } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { toast } from "sonner";
import "@excalidraw/excalidraw/index.css";
import { updateNote } from "@/actions/notes";
import { cn } from "@/lib/utils";

// Minimal structural types — we only serialize, never introspect. Avoids the
// fragile deep type-path imports from the excalidraw package.
type CanvasElements = readonly unknown[];
type CanvasFiles = Record<string, unknown>;

// Excalidraw is browser-only + heavy — load on demand, never SSR.
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading board…
      </p>
    ),
  }
);

export function NoteCanvas({
  noteId,
  title,
  initialCanvas,
}: {
  noteId: string;
  title: string;
  initialCanvas: string;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [modePending, startModeTransition] = useTransition();
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  function switchToPage() {
    startModeTransition(async () => {
      await updateNote(noteId, { mode: "page" });
      router.refresh();
    });
  }

  // restore saved board once on mount
  const initialData = (() => {
    if (!initialCanvas) return undefined;
    try {
      const parsed = JSON.parse(initialCanvas);
      return {
        elements: parsed.elements ?? [],
        appState: { ...parsed.appState, collaborators: undefined },
        files: parsed.files ?? {},
      };
    } catch {
      return undefined;
    }
  })();

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const onChange = useCallback(
    (elements: CanvasElements, _state: unknown, files: CanvasFiles) => {
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        // strip volatile UI state; keep only what redraws the board
        const snapshot = JSON.stringify({
          elements,
          files,
        });
        updateNote(noteId, { canvas: snapshot })
          .then(() => setSaveState("saved"))
          .catch(() => {
            toast.error("Board save failed");
            setSaveState("idle");
          });
      }, 1200);
    },
    [noteId]
  );

  // True fullscreen: fixed overlay escaping the app shell. Excalidraw needs the
  // whole viewport, same as the spreadsheet editor.
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Link
          href="/notes"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          aria-label="Back to notes"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="truncate text-sm font-semibold">{title || "Canvas"}</span>

        {/* Mode toggle — switch back to page without leaving the note */}
        <div className={cn("ml-2 flex rounded-md border border-border p-0.5", modePending && "opacity-50")}>
          <button
            onClick={switchToPage}
            disabled={modePending}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent"
          >
            <FileText className="h-3 w-3" /> Page
          </button>
          <button
            disabled
            className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-[11px] font-medium"
          >
            <PenTool className="h-3 w-3" /> Canvas
          </button>
        </div>

        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          {saveState === "saving" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Saving
            </>
          ) : saveState === "saved" ? (
            <>
              <Check className="h-3 w-3" /> Saved
            </>
          ) : null}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <Excalidraw
          initialData={initialData}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
