"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarDays, Flag, Plus, Repeat, Tag, X } from "lucide-react";
import { createTask } from "@/actions/tasks";
import { getTags } from "@/actions/organize";
import { cn } from "@/lib/utils";
import type { Recurrence } from "@/lib/recurrence";

interface QuickAddProps {
  projectId?: string;
  areaId?: string;
  defaultDueDate?: string; // yyyy-MM-dd
  projects?: { id: string; name: string }[];
}

type TagRow = { id: string; name: string; color: string };

const PRIORITIES = [
  { value: 1, label: "P1", className: "text-red-500" },
  { value: 2, label: "P2", className: "text-amber-500" },
  { value: 3, label: "P3", className: "text-blue-500" },
  { value: 4, label: "None", className: "text-muted-foreground" },
];

const RECURRENCE_PRESETS: { label: string; value: Recurrence | null }[] = [
  { label: "No repeat", value: null },
  { label: "Daily", value: { freq: "daily", interval: 1 } },
  { label: "Weekly", value: { freq: "weekly", interval: 1 } },
  { label: "Weekdays", value: { freq: "weekly", interval: 1, byWeekday: [1, 2, 3, 4, 5] } },
  { label: "Monthly", value: { freq: "monthly", interval: 1 } },
];

export function QuickAdd({ projectId, areaId, defaultDueDate, projects = [] }: QuickAddProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate ?? "");
  const [priority, setPriority] = useState(4);
  const [recurrenceIdx, setRecurrenceIdx] = useState(0);
  const [selectedProject, setSelectedProject] = useState(projectId ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Tag picker state
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [allTags, setAllTags] = useState<TagRow[]>([]);
  const [tagsLoaded, setTagsLoaded] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  // Lazy-load tags when picker first opens
  useEffect(() => {
    if (!tagPickerOpen || tagsLoaded) return;
    getTags().then((rows) => {
      setAllTags(rows);
      setTagsLoaded(true);
    });
  }, [tagPickerOpen, tagsLoaded]);

  // Close on outside click
  useEffect(() => {
    if (!tagPickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setTagPickerOpen(false);
        setTagSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [tagPickerOpen]);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function submit() {
    const t = title.trim();
    if (!t) return;
    const rec = RECURRENCE_PRESETS[recurrenceIdx].value;
    startTransition(async () => {
      await createTask({
        title: t,
        projectId: selectedProject || projectId || null,
        areaId: areaId ?? null,
        priority,
        dueDate: dueDate || null,
        recurrence: rec ? JSON.stringify(rec) : null,
        tagIds: selectedTagIds,
      });
      setTitle("");
      setSelectedTagIds([]);
      inputRef.current?.focus();
    });
  }

  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );
  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));

  return (
    <div className="rounded-lg border border-border bg-card">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2 px-3 py-2"
      >
        <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {title.trim() && (
          <button
            disabled={pending}
            className="shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Add
          </button>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
        <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-transparent outline-none"
          />
        </label>

        <div className="flex items-center gap-0.5">
          <Flag className="h-3.5 w-3.5 text-muted-foreground" />
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={cn(
                "rounded px-1.5 py-0.5 text-xs",
                p.className,
                priority === p.value ? "bg-accent font-semibold" : "opacity-60"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Repeat className="h-3.5 w-3.5" />
          <select
            value={recurrenceIdx}
            onChange={(e) => setRecurrenceIdx(Number(e.target.value))}
            className="bg-transparent outline-none"
          >
            {RECURRENCE_PRESETS.map((r, i) => (
              <option key={r.label} value={i}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        {projects.length > 0 && !projectId && (
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-transparent text-xs text-muted-foreground outline-none"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {/* Tag picker */}
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setTagPickerOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent",
              tagPickerOpen && "bg-accent"
            )}
          >
            <Tag className="h-3.5 w-3.5" />
            {selectedTagIds.length > 0 ? (
              <span className="font-medium text-foreground">{selectedTagIds.length} tag{selectedTagIds.length !== 1 ? "s" : ""}</span>
            ) : (
              "Tags"
            )}
          </button>

          {tagPickerOpen && (
            <div className="animate-scale-in absolute bottom-full left-0 z-50 mb-1.5 w-52 origin-bottom-left rounded-xl border border-border bg-card shadow-lg">
              <div className="border-b border-border px-2 py-1.5">
                <input
                  autoFocus
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Search tags…"
                  className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-44 overflow-y-auto p-1">
                {!tagsLoaded ? (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">Loading…</p>
                ) : filteredTags.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    {allTags.length === 0 ? "No tags yet. Create tags in Settings." : "No matches."}
                  </p>
                ) : (
                  filteredTags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent",
                          selected && "bg-accent/60"
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 truncate text-left">{tag.name}</span>
                        {selected && <span className="text-[10px] font-semibold text-primary">✓</span>}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected tag chips */}
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: tag.color + "22", color: tag.color }}
          >
            #{tag.name}
            <button type="button" onClick={() => toggleTag(tag.id)} className="opacity-60 hover:opacity-100">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
