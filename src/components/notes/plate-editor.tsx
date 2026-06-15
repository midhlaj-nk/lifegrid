"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plate,
  PlateContent,
  PlateElement,
  PlateLeaf,
  createPlateEditor,
  useEditorRef,
  useElement,
} from "@udecode/plate/react";
import type { TElement } from "@udecode/slate";
import { ParagraphPlugin } from "@udecode/plate/react";
import { HeadingPlugin } from "@udecode/plate-heading/react";
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
} from "@udecode/plate-basic-marks/react";
import {
  ListPlugin,
  BulletedListPlugin,
  NumberedListPlugin,
  ListItemPlugin,
  ListItemContentPlugin,
  TodoListPlugin,
} from "@udecode/plate-list/react";
import { HorizontalRulePlugin } from "@udecode/plate-horizontal-rule/react";
import { LinkPlugin } from "@udecode/plate-link/react";
import { CodeBlockPlugin, CodeLinePlugin } from "@udecode/plate-code-block/react";
import { AutoformatPlugin } from "@udecode/plate-autoformat/react";
import { ResetNodePlugin } from "@udecode/plate-reset-node/react";
import { SlashPlugin, SlashInputPlugin } from "@udecode/plate-slash-command/react";
import {
  Bold,
  Code,
  Italic,
  Loader2,
  Sparkles,
  Strikethrough,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  CheckSquare,
  Quote,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { updateNote } from "@/actions/notes";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

// ─── Autoformat rules ─────────────────────────────────────────────────────────
// Note: heading uses {type:"heading", level:N} in Plate v49
const autoformatRules = [
  { mode: "block" as const, type: "ul", match: ["- ", "* "] },
  { mode: "block" as const, type: "ol", match: ["1. ", "1) "] },
  { mode: "block" as const, type: "todo_li", match: "[] " },
  {
    mode: "mark" as const,
    type: BoldPlugin.key,
    match: { trigger: "*", start: "*", end: "*" },
  },
  {
    mode: "mark" as const,
    type: ItalicPlugin.key,
    match: { trigger: "_", start: "_", end: "_" },
  },
  {
    mode: "mark" as const,
    type: "strikethrough",
    match: { trigger: "~", start: "~~", end: "~~" },
  },
  {
    mode: "mark" as const,
    type: "code",
    match: { trigger: "`", start: "`", end: "`" },
  },
];

// ─── Element renderers ────────────────────────────────────────────────────────
function ParagraphElement({
  children,
  ...props
}: React.ComponentProps<typeof PlateElement>) {
  return (
    <PlateElement as="p" className="m-0 py-0.5 leading-7" {...props}>
      {children}
    </PlateElement>
  );
}

function HeadingElement({ children, ...props }: React.ComponentProps<typeof PlateElement>) {
  const el = useElement<TElement & { level?: number }>();
  const level = el.level ?? 1;
  const tag = (["h1", "h2", "h3"] as const)[level - 1] ?? "h1";
  const classes = [
    level === 1 && "mt-8 mb-1 text-3xl font-bold tracking-tight",
    level === 2 && "mt-6 mb-1 text-2xl font-bold",
    level === 3 && "mt-4 mb-1 text-xl font-semibold",
  ].find(Boolean) as string;
  return (
    <PlateElement as={tag} className={classes} {...props}>
      {children}
    </PlateElement>
  );
}

function BlockquoteElement({ children, ...props }: React.ComponentProps<typeof PlateElement>) {
  return (
    <PlateElement
      as="blockquote"
      className="my-1 border-l-4 border-primary/40 pl-4 italic text-muted-foreground"
      {...props}
    >
      {children}
    </PlateElement>
  );
}

function HrElement({ children, ...props }: React.ComponentProps<typeof PlateElement>) {
  return (
    <PlateElement {...props}>
      <hr className="my-4 border-border" contentEditable={false} />
      {children}
    </PlateElement>
  );
}

function CodeBlockElement({ children, ...props }: React.ComponentProps<typeof PlateElement>) {
  return (
    <PlateElement
      as="pre"
      className="my-2 overflow-x-auto rounded-md bg-muted px-4 py-3 font-mono text-sm leading-6"
      {...props}
    >
      <code>{children}</code>
    </PlateElement>
  );
}

function CodeLineElement({ children, ...props }: React.ComponentProps<typeof PlateElement>) {
  return (
    <PlateElement as="div" {...props}>
      {children}
    </PlateElement>
  );
}

function UlElement({ children, ...props }: React.ComponentProps<typeof PlateElement>) {
  return (
    <PlateElement as="ul" className="my-1 list-disc pl-6" {...props}>
      {children}
    </PlateElement>
  );
}
function OlElement({ children, ...props }: React.ComponentProps<typeof PlateElement>) {
  return (
    <PlateElement as="ol" className="my-1 list-decimal pl-6" {...props}>
      {children}
    </PlateElement>
  );
}
function LiElement({ children, ...props }: React.ComponentProps<typeof PlateElement>) {
  return (
    <PlateElement as="li" className="py-0.5 leading-7" {...props}>
      {children}
    </PlateElement>
  );
}
function LicElement({ children, ...props }: React.ComponentProps<typeof PlateElement>) {
  return <PlateElement as="span" {...props}>{children}</PlateElement>;
}

function TodoElement({ children, ...props }: React.ComponentProps<typeof PlateElement>) {
  const element = useElement<TElement & { checked?: boolean }>();
  const editor = useEditorRef();
  return (
    <PlateElement {...props}>
      <div className="flex items-start gap-2 py-0.5">
        <input
          type="checkbox"
          checked={!!element.checked}
          onChange={(e) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (editor as any).tf?.setNodes?.({ checked: e.target.checked });
          }}
          contentEditable={false}
          className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-primary"
        />
        <span
          className={cn(
            "flex-1 leading-7",
            element.checked && "text-muted-foreground line-through"
          )}
        >
          {children}
        </span>
      </div>
    </PlateElement>
  );
}

function LinkElement({ children, ...props }: React.ComponentProps<typeof PlateElement>) {
  const element = useElement<TElement & { url?: string }>();
  return (
    <PlateElement {...props}>
      {/* Wrapping anchor avoids PlateElement href TS mismatch */}
      <a
        href={element.url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80"
      >
        {children}
      </a>
    </PlateElement>
  );
}

// ─── Leaf renderers ───────────────────────────────────────────────────────────
function BoldLeaf({ children, ...props }: React.ComponentProps<typeof PlateLeaf>) {
  return <PlateLeaf as="strong" className="font-bold" {...props}>{children}</PlateLeaf>;
}
function ItalicLeaf({ children, ...props }: React.ComponentProps<typeof PlateLeaf>) {
  return <PlateLeaf as="em" className="italic" {...props}>{children}</PlateLeaf>;
}
function UnderlineLeaf({ children, ...props }: React.ComponentProps<typeof PlateLeaf>) {
  return <PlateLeaf as="u" {...props}>{children}</PlateLeaf>;
}
function StrikethroughLeaf({ children, ...props }: React.ComponentProps<typeof PlateLeaf>) {
  return <PlateLeaf as="s" {...props}>{children}</PlateLeaf>;
}
function CodeLeaf({ children, ...props }: React.ComponentProps<typeof PlateLeaf>) {
  return (
    <PlateLeaf
      as="code"
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.875em]"
      {...props}
    >
      {children}
    </PlateLeaf>
  );
}

function SlashCommandElement({ children, ...props }: React.ComponentProps<typeof PlateElement>) {
  return (
    <PlateElement className="my-1 flex animate-scale-in flex-col gap-1 rounded-lg border border-border bg-card p-2 shadow-lg" {...props}>
      {children}
    </PlateElement>
  );
}

// ─── Floating toolbar ─────────────────────────────────────────────────────────
function FloatingToolbar() {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const editor = useEditorRef();

  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setShow(false);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0) {
        setShow(false);
        return;
      }
      setPos({
        top: rect.top + window.scrollY - 48,
        left: rect.left + rect.width / 2,
      });
      setShow(true);
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  if (!show) return null;

  function toggleMark(key: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tf = (editor as any).tf;
    if (tf?.toggle?.mark) tf.toggle.mark({ key });
  }

  const tools = [
    { key: BoldPlugin.key, Icon: Bold, title: "Bold (⌘B)" },
    { key: ItalicPlugin.key, Icon: Italic, title: "Italic (⌘I)" },
    { key: UnderlinePlugin.key, Icon: Underline, title: "Underline" },
    { key: StrikethroughPlugin.key, Icon: Strikethrough, title: "Strikethrough" },
    { key: CodePlugin.key, Icon: Code, title: "Code" },
  ];

  return (
    <div
      className="pointer-events-auto fixed z-[100] flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg"
      style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {tools.map(({ key, Icon, title }) => (
        <button
          key={key}
          title={title}
          onMouseDown={() => toggleMark(key)}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

// ─── AI toolbar ───────────────────────────────────────────────────────────────
const AI_COMMANDS = [
  { key: "summarize", label: "Summarize" },
  { key: "improve", label: "Improve writing" },
  { key: "continue", label: "Continue" },
  { key: "grammar", label: "Fix grammar" },
] as const;

// ─── Main editor ──────────────────────────────────────────────────────────────
export function PlateEditor({
  noteId,
  initialContent,
}: {
  noteId: string;
  initialContent: string;
}) {
  const { resolvedTheme } = useTheme();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  const initialValue = useMemo(() => {
    try {
      const parsed = JSON.parse(initialContent);
      if (!Array.isArray(parsed) || !parsed.length) return undefined;
      // Plate nodes use `children` (Slate). BlockNote uses `content`. Reject BlockNote format.
      const first = parsed[0] as Record<string, unknown>;
      if (!Array.isArray(first?.children)) return undefined;
      return parsed;
    } catch {
      return undefined;
    }
  }, [initialContent]);

  const editor = useMemo(
    () =>
      createPlateEditor({
        plugins: [
          ParagraphPlugin,
          HeadingPlugin,
          BoldPlugin,
          ItalicPlugin,
          UnderlinePlugin,
          StrikethroughPlugin,
          CodePlugin,
          ListPlugin,
          HorizontalRulePlugin,
          LinkPlugin,
          AutoformatPlugin.configure({ options: { rules: autoformatRules, enableUndoOnDelete: true } }),
          CodeBlockPlugin,
          CodeLinePlugin,
        ],
        value: initialValue ?? [{ type: "p", children: [{ text: "" }] }],
        components: {
          [ParagraphPlugin.key]: ParagraphElement,
          [HeadingPlugin.key]: HeadingElement,
          [HorizontalRulePlugin.key]: HrElement,
          [CodeBlockPlugin.key]: CodeBlockElement,
          [CodeLinePlugin.key]: CodeLineElement,
          [BulletedListPlugin.key]: UlElement,
          [NumberedListPlugin.key]: OlElement,
          [ListItemPlugin.key]: LiElement,
          [ListItemContentPlugin.key]: LicElement,
          [LinkPlugin.key]: LinkElement,
          [BoldPlugin.key]: BoldLeaf,
          [ItalicPlugin.key]: ItalicLeaf,
          [UnderlinePlugin.key]: UnderlineLeaf,
          [StrikethroughPlugin.key]: StrikethroughLeaf,
          [CodePlugin.key]: CodeLeaf,
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleChange = useCallback(
    ({ value }: { value: unknown[] }) => {
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateNote(noteId, { content: JSON.stringify(value) })
          .then(() => setSaveState("saved"))
          .catch(() => {
            toast.error("Save failed");
            setSaveState("idle");
          });
      }, 800);
    },
    [noteId]
  );

  async function runAi(command: string, lang?: string) {
    const plain = editor.children
      .map((n) => {
        const node = n as { children?: Array<{ text?: string }> };
        return (node.children ?? []).map((c) => c.text ?? "").join("");
      })
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
      const label = AI_COMMANDS.find((c) => c.key === command)?.label ?? command;
      const newBlocks = [
        { type: "h3", children: [{ text: `✨ ${label}` }] },
        ...data.result
          .split("\n")
          .filter((l: string) => l.trim())
          .map((l: string) => ({ type: "p", children: [{ text: l }] })),
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor as any).tf?.insertNodes?.(newBlocks, {
        at: [editor.children.length],
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiBusy(null);
    }
  }

  return (
    <div className={cn("space-y-2", resolvedTheme === "dark" ? "dark" : "")}>
      {/* AI toolbar */}
      <div className="flex flex-wrap items-center gap-1">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        {AI_COMMANDS.map((c) => (
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
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved ✓"
              : ""}
        </span>
      </div>

      {/* Plate editor */}
      <Plate editor={editor} onChange={handleChange}>
        <FloatingToolbar />
        <PlateContent
          className="min-h-[40vh] rounded-md px-1 py-2 text-sm outline-none focus-within:outline-none"
          placeholder="Start writing… Type / for commands"
          spellCheck
        />
      </Plate>
    </div>
  );
}
