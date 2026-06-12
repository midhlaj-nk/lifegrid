"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { createTag, updateTag, deleteTag } from "@/actions/organize";
import { cn } from "@/lib/utils";

type Tag = { id: string; name: string; color: string };

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#ec4899", "#6366f1", "#14b8a6", "#f43f5e",
];

function ColorDot({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-5 w-5 rounded-full transition-transform hover:scale-110"
      style={{ backgroundColor: color }}
    >
      {selected && (
        <Check className="absolute inset-0 m-auto h-3 w-3 text-white" strokeWidth={3} />
      )}
    </button>
  );
}

function TagRow({ tag, onSaved, onDeleted }: { tag: Tag; onSaved: (t: Tag) => void; onDeleted: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!name.trim()) return;
    startTransition(async () => {
      await updateTag(tag.id, { name: name.trim(), color });
      onSaved({ ...tag, name: name.trim(), color });
      setEditing(false);
    });
  }

  function cancel() {
    setName(tag.name);
    setColor(tag.color);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-accent/30 p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <ColorDot key={c} color={c} selected={color === c} onClick={() => setColor(c)} />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={!name.trim() || pending}
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={cancel}
            className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent/50">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
      <span className="flex-1 text-sm">{tag.name}</span>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            startTransition(async () => {
              await deleteTag(tag.id);
              onDeleted(tag.id);
            });
          }}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function TagsSettings({ initialTags }: { initialTags: Tag[] }) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[4]);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const id = await createTag({ name: newName.trim(), color: newColor });
      setTags((prev) => [...prev, { id, name: newName.trim(), color: newColor }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewColor(PRESET_COLORS[4]);
      setShowCreate(false);
    });
  }

  return (
    <div className="space-y-4">
      {tags.length === 0 && !showCreate ? (
        <p className="text-sm text-muted-foreground">No tags yet. Create one to start organising tasks.</p>
      ) : (
        <div className="space-y-0.5">
          {tags.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              onSaved={(updated) =>
                setTags((prev) =>
                  prev.map((t) => (t.id === updated.id ? updated : t)).sort((a, b) => a.name.localeCompare(b.name))
                )
              }
              onDeleted={(id) => setTags((prev) => prev.filter((t) => t.id !== id))}
            />
          ))}
        </div>
      )}

      {showCreate ? (
        <div className="rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: newColor }} />
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setShowCreate(false); setNewName(""); } }}
              placeholder="Tag name"
              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <ColorDot key={c} color={c} selected={newColor === c} onClick={() => setNewColor(c)} />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || pending}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              Create tag
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(""); }}
              className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          New tag
        </button>
      )}
    </div>
  );
}
