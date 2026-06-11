"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { updateNote } from "@/actions/notes";

const AI_COMMANDS = [
  { key: "summarize", label: "Summarize" },
  { key: "improve", label: "Improve writing" },
  { key: "continue", label: "Continue writing" },
  { key: "grammar", label: "Fix grammar" },
  { key: "translate", label: "Translate…" },
] as const;

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

  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  async function runAi(command: string, lang?: string) {
    const plain = editor.document
      .map((b) =>
        Array.isArray(b.content)
          ? b.content
              .map((c) => ("text" in c ? (c as { text: string }).text : ""))
              .join("")
          : ""
      )
      .join("\n")
      .trim();
    if (!plain) return toast.error("Note is empty");

    setAiBusy(command);
    try {
      const res = await fetch("/api/ai/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, text: plain, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI failed");
      const last = editor.document[editor.document.length - 1];
      const label = AI_COMMANDS.find((c) => c.key === command)?.label ?? command;
      editor.insertBlocks(
        [
          { type: "heading", props: { level: 3 }, content: `✨ ${label}` },
          ...data.result
            .split("\n")
            .filter((line: string) => line.trim())
            .map((line: string) => ({
              type: "paragraph" as const,
              content: line,
            })),
        ],
        last,
        "after"
      );
      updateNote(noteId, { content: JSON.stringify(editor.document) }).catch(
        console.error
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        {AI_COMMANDS.filter((c) => c.key !== "translate").map((c) => (
          <button
            key={c.key}
            onClick={() => runAi(c.key)}
            disabled={aiBusy !== null}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            {aiBusy === c.key && <Loader2 className="h-3 w-3 animate-spin" />}
            {c.label}
          </button>
        ))}
        <select
          disabled={aiBusy !== null}
          value=""
          onChange={(e) => e.target.value && runAi("translate", e.target.value)}
          className="rounded-full border border-border bg-transparent px-2 py-1 text-[11px] text-muted-foreground outline-none disabled:opacity-50"
        >
          <option value="">Translate…</option>
          {["Malayalam", "Hindi", "English", "Arabic", "Tamil"].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : ""}
        </span>
      </div>
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={() => {
          setSaveState("saving");
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            updateNote(noteId, {
              content: JSON.stringify(editor.document),
            })
              .then(() => setSaveState("saved"))
              .catch((e) => {
                console.error(e);
                toast.error("Save failed — copy your text");
                setSaveState("idle");
              });
          }, 800);
        }}
      />
    </div>
  );
}
