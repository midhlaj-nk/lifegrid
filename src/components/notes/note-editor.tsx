"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { updateNote } from "@/actions/notes";

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  const { url } = await res.json();
  return url;
}

export function NoteEditor({
  noteId,
  initialContent,
}: {
  noteId: string;
  initialContent: string;
}) {
  const { resolvedTheme } = useTheme();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parsed = useMemo(() => {
    try {
      const blocks = JSON.parse(initialContent);
      return Array.isArray(blocks) && blocks.length ? blocks : undefined;
    } catch {
      return undefined;
    }
  }, [initialContent]);

  const editor = useCreateBlockNote({
    initialContent: parsed,
    uploadFile,
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onChange={() => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          updateNote(noteId, {
            content: JSON.stringify(editor.document),
          }).catch(console.error);
        }, 800);
      }}
    />
  );
}
