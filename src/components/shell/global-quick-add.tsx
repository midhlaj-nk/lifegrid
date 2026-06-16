"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Check, ChevronDown, Clock, Flag,
  FolderOpen, Hash, Mic, MicOff, Repeat, Sparkles, X, Zap,
} from "lucide-react";
import { addDays, format, nextSaturday, parseISO } from "date-fns";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { quickAddTask } from "@/actions/quick-add";
import { parseQuickAdd } from "@/lib/nl-parse";
import { describeRecurrence } from "@/lib/recurrence";
import { cn } from "@/lib/utils";

type TagItem = { id: string; name: string; color: string };
type ProjectItem = { id: string; name: string; color: string; areaId: string | null };

interface Props { tags: TagItem[]; projects: ProjectItem[] }

type Picker = "date" | "time" | "priority" | "tags" | "project" | "recurrence" | null;

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "P1", color: "text-red-500" },
  2: { label: "P2", color: "text-amber-500" },
  3: { label: "P3", color: "text-blue-500" },
  4: { label: "None", color: "text-muted-foreground" },
};

const TIME_PRESETS = [
  { label: "Morning", value: "09:00" },
  { label: "Afternoon", value: "14:00" },
  { label: "Evening", value: "19:00" },
  { label: "Night", value: "22:00" },
];

const RECURRENCE_PRESETS = [
  { label: "Daily", freq: "daily", interval: 1 },
  { label: "Weekdays", freq: "weekly", interval: 1, byWeekday: [1, 2, 3, 4, 5] },
  { label: "Weekly", freq: "weekly", interval: 1 },
  { label: "Monthly", freq: "monthly", interval: 1 },
] as const;

function useIsMobile() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setV(mq.matches);
    const h = (e: MediaQueryListEvent) => setV(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return v;
}

export function GlobalQuickAdd({ tags, projects }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [picker, setPicker] = useState<Picker>(null);
  const [overrideDate, setOverrideDate] = useState<string | null>(null);
  const [overrideTime, setOverrideTime] = useState<string | null>(null);
  const [overridePriority, setOverridePriority] = useState<number | null>(null);
  const [overrideRecurrence, setOverrideRecurrence] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [addAnother, setAddAnother] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [listening, setListening] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        (e.key === "q" || e.key === "Q") &&
        !e.metaKey && !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") { setOpen(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const preview = useMemo(() => (text.trim() ? parseQuickAdd(text) : null), [text]);

  const dueDate = overrideDate ?? preview?.dueDate ?? null;
  const dueTime = overrideTime ?? preview?.dueTime ?? null;
  const priority = overridePriority ?? preview?.priority ?? 4;
  const recurrenceJson = overrideRecurrence ?? (preview?.recurrence ? JSON.stringify(preview.recurrence) : null);

  function reset() {
    setText(""); setPicker(null); setOverrideDate(null); setOverrideTime(null);
    setOverridePriority(null); setOverrideRecurrence(null);
    setSelectedTagIds([]); setProjectId(null);
  }

  function handleClose() { reset(); setAddedCount(0); setOpen(false); }

  function togglePicker(p: Picker) { setPicker((cur) => (cur === p ? null : p)); }

  // Date quick-picks
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const weekend = format(nextSaturday(new Date()), "yyyy-MM-dd");
  const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const DATE_PRESETS = [
    { label: "Today", value: today },
    { label: "Tomorrow", value: tomorrow },
    { label: "Weekend", value: weekend },
    { label: "Next week", value: nextWeek },
  ];

  function startVoice() {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition ??
                (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice not supported in this browser"); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SR as any)();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: { results: { transcript: string }[][] }) => {
      const transcript = e.results[0][0].transcript;
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stopVoice() {
    (recognitionRef.current as { stop?: () => void } | null)?.stop?.();
    setListening(false);
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim()) return;
    startTransition(async () => {
      const r = await quickAddTask(text, {
        dueDate: overrideDate,
        dueTime: overrideTime,
        priority: overridePriority ?? undefined,
        tagIds: selectedTagIds,
        projectId,
        recurrenceOverride: overrideRecurrence,
      });
      if (r.ok) {
        toast.success("Task added", {
          action: {
            label: "View",
            onClick: () => router.push("/today"),
          },
        });
        if (addAnother) {
          setAddedCount((n) => n + 1);
          setText("");
          setPicker(null);
          setTimeout(() => inputRef.current?.focus(), 50);
        } else {
          handleClose();
        }
      } else {
        toast.error(r.error);
      }
    });
  }

  async function aiCapture() {
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI capture failed");
      toast.success(`Created: ${data.item.title}`);
      if (addAnother) { setText(""); } else { handleClose(); router.refresh(); }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  const selectedProject = projects.find((p) => p.id === projectId);
  const nlTags = preview?.tagNames ?? [];
  const recurrenceObj = recurrenceJson ? (() => { try { return JSON.parse(recurrenceJson); } catch { return null; } })() : null;

  const content = (
    <form onSubmit={submit} className="flex flex-col">
      {/* Title + mic */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Zap className="h-4 w-4 shrink-0 text-amber-500" />
        <input
          ref={inputRef}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
        />
        <div className="flex shrink-0 items-center gap-1">
          {/* Voice input */}
          {"SpeechRecognition" in window || "webkitSpeechRecognition" in window ? (
            <button
              type="button"
              onClick={listening ? stopVoice : startVoice}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors touch:h-10 touch:w-10",
                listening ? "bg-red-500 text-white animate-pulse" : "text-muted-foreground hover:bg-accent"
              )}
              aria-label={listening ? "Stop voice" : "Voice input"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          ) : null}
          {text && (
            <button type="button" onClick={() => setText("")} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent touch:h-10 touch:w-10">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* NL parsed preview */}
      {preview && (preview.dueDate || preview.priority < 4 || nlTags.length > 0 || preview.recurrence) && !overrideDate && !overridePriority && !selectedTagIds.length && !overrideRecurrence && (
        <div className="flex flex-wrap gap-1.5 border-t border-border/50 px-4 py-2 text-xs">
          <span className="text-muted-foreground/60">Parsed:</span>
          {preview.dueDate && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {format(parseISO(preview.dueDate), "d MMM")}
              {preview.dueTime && ` · ${preview.dueTime}`}
            </span>
          )}
          {preview.priority < 4 && (
            <span className={cn("inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5", PRIORITY_LABELS[preview.priority].color)}>
              <Flag className="h-3 w-3" />{PRIORITY_LABELS[preview.priority].label}
            </span>
          )}
          {preview.recurrence && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-muted-foreground">
              <Repeat className="h-3 w-3" />{describeRecurrence(preview.recurrence)}
            </span>
          )}
          {nlTags.map((t) => (
            <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
              <Hash className="h-3 w-3" />{t}
            </span>
          ))}
        </div>
      )}

      {/* Picker panels */}
      {picker === "date" && (
        <div className="border-t border-border/50 px-4 py-3 space-y-3">
          {/* Quick picks */}
          <div className="grid grid-cols-4 gap-2">
            {DATE_PRESETS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => { setOverrideDate(overrideDate === d.value ? null : d.value); }}
                className={cn(
                  "rounded-xl border py-2.5 text-xs font-medium transition-colors",
                  overrideDate === d.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent text-muted-foreground"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          {/* Native date input fallback */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={overrideDate ?? ""}
              onChange={(e) => setOverrideDate(e.target.value || null)}
              className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {overrideDate && (
              <button type="button" onClick={() => setOverrideDate(null)} className="text-xs text-muted-foreground">Clear</button>
            )}
          </div>
        </div>
      )}

      {picker === "time" && (
        <div className="border-t border-border/50 px-4 py-3 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {TIME_PRESETS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setOverrideTime(overrideTime === t.value ? null : t.value); }}
                className={cn(
                  "rounded-xl border py-2.5 text-xs font-medium transition-colors",
                  overrideTime === t.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent text-muted-foreground"
                )}
              >
                <div>{t.label}</div>
                <div className="text-[10px] opacity-60">{t.value}</div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={overrideTime ?? ""}
              onChange={(e) => setOverrideTime(e.target.value || null)}
              className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {overrideTime && (
              <button type="button" onClick={() => setOverrideTime(null)} className="text-xs text-muted-foreground">Clear</button>
            )}
          </div>
        </div>
      )}

      {picker === "priority" && (
        <div className="border-t border-border/50 px-4 py-3">
          <div className="grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setOverridePriority(p === 4 ? null : p); setPicker(null); }}
                className={cn(
                  "rounded-xl border py-3 text-sm font-semibold transition-colors",
                  (overridePriority ?? (preview?.priority ?? 4)) === p
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent",
                  PRIORITY_LABELS[p].color
                )}
              >
                {PRIORITY_LABELS[p].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {picker === "recurrence" && (
        <div className="border-t border-border/50 px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setOverrideRecurrence(null); setPicker(null); }}
              className={cn(
                "rounded-xl border py-3 text-sm font-medium transition-colors",
                !overrideRecurrence ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent text-muted-foreground"
              )}
            >
              None
            </button>
            {RECURRENCE_PRESETS.map((r) => {
              const val = JSON.stringify({ freq: r.freq, interval: r.interval, ...("byWeekday" in r ? { byWeekday: r.byWeekday } : {}) });
              const active = overrideRecurrence === val;
              return (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => { setOverrideRecurrence(active ? null : val); setPicker(null); }}
                  className={cn(
                    "rounded-xl border py-3 text-sm font-medium transition-colors",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent text-muted-foreground"
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {picker === "tags" && (
        <div className="border-t border-border/50 px-4 py-3">
          {tags.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tags yet — type #tagname in the title</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const sel = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setSelectedTagIds((ids) => sel ? ids.filter((id) => id !== tag.id) : [...ids, tag.id])}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors touch:py-2.5",
                      sel ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                    )}
                    style={{ color: tag.color }}
                  >
                    {sel && <Check className="h-3.5 w-3.5 text-primary" />}
                    #{tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {picker === "project" && (
        <div className="border-t border-border/50 px-4 py-3">
          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground">No projects yet</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => { setProjectId(null); setPicker(null); }}
                className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent", !projectId && "bg-accent font-medium")}
              >
                No project
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setProjectId(p.id); setPicker(null); }}
                  className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent", projectId === p.id && "bg-accent font-medium")}
                >
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  {p.name}
                  {projectId === p.id && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scrollable toolbar */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-border/50 px-3 py-2 scrollbar-none">
        <ToolbarBtn active={!!dueDate} highlight={!!dueDate} open={picker === "date"} onClick={() => togglePicker("date")}>
          <CalendarDays className="h-3.5 w-3.5" />
          {dueDate ? format(parseISO(dueDate), "d MMM") : "Due"}
        </ToolbarBtn>

        <ToolbarBtn active={!!dueTime} highlight={!!dueTime} open={picker === "time"} onClick={() => togglePicker("time")}>
          <Clock className="h-3.5 w-3.5" />
          {dueTime ?? "Time"}
        </ToolbarBtn>

        <ToolbarBtn
          active={priority < 4}
          highlight={priority < 4}
          open={picker === "priority"}
          onClick={() => togglePicker("priority")}
          colorClass={priority < 4 ? PRIORITY_LABELS[priority].color : undefined}
        >
          <Flag className="h-3.5 w-3.5" />
          {priority < 4 ? PRIORITY_LABELS[priority].label : "Priority"}
        </ToolbarBtn>

        <ToolbarBtn active={!!recurrenceJson} highlight={!!recurrenceJson} open={picker === "recurrence"} onClick={() => togglePicker("recurrence")}>
          <Repeat className="h-3.5 w-3.5" />
          {recurrenceObj ? describeRecurrence(recurrenceObj) : "Repeat"}
        </ToolbarBtn>

        <ToolbarBtn
          active={selectedTagIds.length > 0}
          highlight={selectedTagIds.length > 0}
          open={picker === "tags"}
          onClick={() => togglePicker("tags")}
          colorClass={selectedTagIds.length > 0 ? "text-emerald-600 dark:text-emerald-400" : undefined}
        >
          <Hash className="h-3.5 w-3.5" />
          {selectedTagIds.length > 0 ? `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? "s" : ""}` : "Tags"}
        </ToolbarBtn>

        <ToolbarBtn active={!!projectId} highlight={!!projectId} open={picker === "project"} onClick={() => togglePicker("project")}>
          <FolderOpen className="h-3.5 w-3.5" />
          {selectedProject ? (
            <>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedProject.color }} />
              {selectedProject.name}
            </>
          ) : (
            <>Project <ChevronDown className="h-3 w-3" /></>
          )}
        </ToolbarBtn>
      </div>

      {/* Footer: add another + actions */}
      <div className="flex items-center gap-2 border-t border-border/50 px-4 py-3">
        <button
          type="button"
          onClick={() => setAddAnother((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors touch:py-2.5",
            addAnother ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
          )}
        >
          <span className={cn("h-3.5 w-3.5 rounded border-2 flex items-center justify-center", addAnother ? "border-primary bg-primary" : "border-muted-foreground")}>
            {addAnother && <Check className="h-2 w-2 text-white" />}
          </span>
          Add another
          {addedCount > 0 && <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-primary">{addedCount}</span>}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled={aiBusy || !text.trim()}
            onClick={aiCapture}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-40 touch:h-11"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {aiBusy ? "…" : "AI"}
          </button>
          <button
            disabled={pending || !text.trim()}
            className="h-9 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50 active:scale-95 touch:h-11"
          >
            {pending ? "…" : "Add"}
          </button>
        </div>
      </div>
    </form>
  );

  if (!open) return null;

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[80] bg-black/50" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[81] rounded-t-2xl border-t border-border bg-background shadow-2xl outline-none">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-2.5 w-20 rounded-full bg-border/80" />
            </div>
            {content}
            <div style={{ height: "env(safe-area-inset-bottom)" }} />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 pt-[15vh]" onClick={handleClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-popover shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  active,
  highlight,
  open,
  onClick,
  colorClass,
}: {
  children: React.ReactNode;
  active: boolean;
  highlight: boolean;
  open: boolean;
  onClick: () => void;
  colorClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors touch:py-3",
        open ? "bg-accent" : "hover:bg-accent",
        highlight && !open ? colorClass ?? "text-primary" : "",
        !highlight && !open ? "text-muted-foreground" : "",
        active && "bg-accent/60",
      )}
    >
      {children}
    </button>
  );
}
