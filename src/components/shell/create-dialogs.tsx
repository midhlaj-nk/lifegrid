"use client";

import { useState, useTransition } from "react";
import { createArea, createProject } from "@/actions/organize";

const AREA_COLORS = ["#6366f1", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6", "#ec4899"];

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-xl border border-border bg-background p-4 shadow-lg sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-sm font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {AREA_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="h-6 w-6 rounded-full ring-offset-2 ring-offset-background transition-shadow"
          style={{
            backgroundColor: c,
            boxShadow: value === c ? `0 0 0 2px var(--background), 0 0 0 4px ${c}` : undefined,
          }}
          aria-label={`Color ${c}`}
        />
      ))}
    </div>
  );
}

export function CreateAreaDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(AREA_COLORS[0]);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <span onClick={() => setOpen(true)}>{children}</span>
      <Modal open={open} onClose={() => setOpen(false)} title="New area">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            startTransition(async () => {
              await createArea({ name: name.trim(), color });
              setName("");
              setOpen(false);
            });
          }}
          className="space-y-3"
        >
          <input
            autoFocus
            placeholder="e.g. Work, Health, Finance"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <ColorPicker value={color} onChange={setColor} />
          <button
            disabled={pending || !name.trim()}
            className="h-9 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Create area
          </button>
        </form>
      </Modal>
    </>
  );
}

export function CreateProjectDialog({
  children,
  areas,
}: {
  children: React.ReactNode;
  areas: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [color, setColor] = useState(AREA_COLORS[5]);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <span onClick={() => setOpen(true)}>{children}</span>
      <Modal open={open} onClose={() => setOpen(false)} title="New project">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            startTransition(async () => {
              await createProject({
                name: name.trim(),
                areaId: areaId || null,
                color,
              });
              setName("");
              setOpen(false);
            });
          }}
          className="space-y-3"
        >
          <input
            autoFocus
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
          >
            <option value="">No area</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <ColorPicker value={color} onChange={setColor} />
          <button
            disabled={pending || !name.trim()}
            className="h-9 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Create project
          </button>
        </form>
      </Modal>
    </>
  );
}
