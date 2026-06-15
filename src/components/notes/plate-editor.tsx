"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCreateBlockNote,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { CheckSquare, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";
import { updateNote, linkNoteToTask } from "@/actions/notes";
import { cn } from "@/lib/utils";

type LinkTarget = { id: string; title: string; icon?: string };

export function PlateEditor({
  noteId,
  initialContent,
  tasks = [],
  notes = [],
}: {
  noteId: string;
  initialContent?: string;
  tasks?: LinkTarget[];
  notes?: LinkTarget[];
}) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [picker, setPicker] = useState<"task" | "note" | null>(null);
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

  // Slash items: BlockNote defaults + our "Link task" / "Link note" entries.
  const getSlashItems = useCallback(
    async (query: string): Promise<DefaultReactSuggestionItem[]> => {
      if (!editor) return [];
      const custom: DefaultReactSuggestionItem[] = [
        {
          title: "Link a task",
          aliases: ["task", "todo", "link"],
          group: "Link",
          subtext: "Reference one of your tasks",
          icon: <CheckSquare className="h-4 w-4" />,
          onItemClick: () => setPicker("task"),
        },
        {
          title: "Link a note",
          aliases: ["note", "page", "link"],
          group: "Link",
          subtext: "Reference another note",
          icon: <FileText className="h-4 w-4" />,
          onItemClick: () => setPicker("note"),
        },
      ];
      const all = [...getDefaultReactSlashMenuItems(editor), ...custom];
      const q = query.trim().toLowerCase();
      if (!q) return all;
      return all.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.aliases ?? []).some((a) => a.toLowerCase().includes(q))
      );
    },
    [editor]
  );

  function handlePick(target: LinkTarget) {
    if (!editor) return;
    const mode = picker;
    setPicker(null);
    if (mode === "note") {
      editor.insertInlineContent([
        { type: "link", href: `/notes/${target.id}`, content: `${target.icon ?? "📄"} ${target.title}` },
        " ",
      ]);
    } else if (mode === "task") {
      // visible inline mention + persist the note↔task link
      editor.insertInlineContent([
        { type: "text", text: `☑ ${target.title}`, styles: { bold: true } },
        " ",
      ]);
      linkNoteToTask(noteId, target.id)
        .then(() => router.refresh())
        .catch(() => toast.error("Couldn't link task"));
    }
    handleChange();
  }

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
        <BlockNoteView
          editor={editor}
          onChange={handleChange}
          theme="dark"
          slashMenu={false}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={getSlashItems}
          />
        </BlockNoteView>
      </div>

      {picker && (
        <LinkPicker
          kind={picker}
          items={picker === "task" ? tasks : notes}
          onPick={handlePick}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function LinkPicker({
  kind,
  items,
  onPick,
  onClose,
}: {
  kind: "task" | "note";
  items: LinkTarget[];
  onPick: (t: LinkTarget) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? items.filter((i) => i.title.toLowerCase().includes(q.trim().toLowerCase()))
    : items;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Link a ${kind}…`}
            className="h-7 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No {kind}s found
            </p>
          ) : (
            filtered.map((it) => (
              <button
                key={it.id}
                onClick={() => onPick(it)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                )}
              >
                <span className="shrink-0">
                  {kind === "task" ? "☑" : it.icon ?? "📄"}
                </span>
                <span className="truncate">{it.title}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
