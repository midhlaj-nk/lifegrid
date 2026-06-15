"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
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

  const validatedContent = (() => {
    if (!initialContent) return undefined;
    try {
      const parsed = JSON.parse(initialContent);
      // Must be a non-empty array of well-formed BlockNote blocks
      // (each block has a string `type` and `id`). Anything else —
      // empty arrays, old Plate/markdown content, corrupted JSON —
      // falls back to a fresh editor instead of crashing.
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every(
          (b) =>
            b &&
            typeof b === "object" &&
            typeof b.type === "string" &&
            typeof b.id === "string"
        )
      ) {
        return parsed;
      }
      return undefined;
    } catch {
      return undefined;
    }
  })();

  const editor = useCreateBlockNote({
    ...(validatedContent ? { initialContent: validatedContent } : {}),
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
    <div className="w-full">
      <div className="mb-1 flex items-center justify-end px-2">
        <span className="text-xs text-muted-foreground">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Unsaved"}
        </span>
      </div>
      {/* No height cap / overflow clip here: the editor grows with content and
          the BlockNote slash menu + toolbars can overflow freely. */}
      <div className="min-h-[55vh] -mx-3 md:-mx-12">
        {editor && (
          <BlockNoteView
            editor={editor}
            onChange={handleChange}
            theme="dark"
          />
        )}
      </div>
    </div>
  );
}
