"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteViewRaw, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/react/style.css";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { updateNote } from "@/actions/notes";

export function PlateEditor({
  noteId,
  initialContent,
}: {
  noteId: string;
  initialContent?: string;
}) {
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  const editor = useCreateBlockNote({
    initialContent: initialContent ? JSON.parse(initialContent) : undefined,
  });

  const handleChange = useCallback(() => {
    setSaveState("dirty");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!editor) return;
      setSaveState("saving");
      try {
        const content = JSON.stringify(editor.document);
        if (content === lastSaved.current) {
          setSaveState("saved");
          return;
        }
        await updateNote(noteId, { content });
        lastSaved.current = content;
        setSaveState("saved");
      } catch {
        toast.error("Failed to save note");
        setSaveState("dirty");
      }
    }, 800);
  }, [editor, noteId]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  if (!editor) return <div className="p-4">Loading editor...</div>;

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link
          href="/notes"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          aria-label="Back to notes"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm text-muted-foreground">
          {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Unsaved"}
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <BlockNoteViewRaw
          editor={editor}
          onChange={handleChange}
          theme="dark"
        />
      </div>
    </div>
  );
}
