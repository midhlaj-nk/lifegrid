"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  useCreateBlockNote,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  createReactBlockSpec,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { CheckSquare, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";
import { updateNote, linkNoteToTask } from "@/actions/notes";
import { toggleTaskDone } from "@/actions/tasks";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type LinkTarget = { id: string; title: string; icon?: string };

// --- Custom block: a linked task reference with interactive checkbox ---

const TaskRefBlock = createReactBlockSpec(
  {
    type: "taskRef" as const,
    propSchema: {
      taskId: { default: "" },
      title: { default: "Task" },
      done: { default: false },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      return (
        <TaskRefInner
          blockId={block.id}
          taskId={block.props.taskId}
          title={block.props.title}
          initialDone={block.props.done}
          onToggle={(done) => {
            editor.updateBlock(block, { props: { ...block.props, done } });
          }}
        />
      );
    },
  }
);

// Separate component so it can use hooks
function TaskRefInner({
  taskId,
  title,
  initialDone,
  onToggle,
}: {
  blockId: string;
  taskId: string;
  title: string;
  initialDone: boolean;
  onToggle: (done: boolean) => void;
}) {
  const [done, setDone] = useState(initialDone);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !done;
    setDone(next);
    onToggle(next);
    startTransition(async () => {
      await toggleTaskDone(taskId);
    });
  }

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 my-1"
      contentEditable={false}
    >
      <button
        onClick={toggle}
        disabled={pending}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
          done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary"
        )}
        aria-label={done ? "Mark not done" : "Mark done"}
      >
        {done && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="1,6 4.5,9.5 11,2" />
          </svg>
        )}
      </button>
      <span className={cn("flex-1 text-sm", done && "text-muted-foreground line-through")}>
        {title}
      </span>
      <CheckSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
    </div>
  );
}

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    // call the factory (createReactBlockSpec returns a factory fn, not a spec directly)
    taskRef: TaskRefBlock(),
  },
});

// -----------------------------------------------------------------------

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
  const { resolvedTheme } = useTheme();
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [picker, setPicker] = useState<"task" | "note" | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  const validatedContent = (() => {
    if (!initialContent) return undefined;
    try {
      const parsed = JSON.parse(initialContent);
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
    schema,
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
      // Insert a live task-ref block (interactive checkbox)
      const { block: current } = editor.getTextCursorPosition();
      editor.insertBlocks(
        [
          {
            type: "taskRef",
            props: {
              taskId: target.id,
              title: target.title,
              done: false,
            },
          },
        ],
        current,
        "after"
      );
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
      <div className="min-h-[55vh] -mx-3 md:-mx-12">
        <BlockNoteView
          editor={editor}
          onChange={handleChange}
          theme={resolvedTheme === "light" ? "light" : "dark"}
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
