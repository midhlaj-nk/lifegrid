"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, FilePlus, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createNote, deleteNote } from "@/actions/notes";
import { useConfirm } from "@/components/ui/app-dialog";

export interface NoteNode {
  id: string;
  title: string;
  icon: string;
  parentId: string | null;
}

export function NotesTree({ notes }: { notes: NoteNode[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = q
    ? notes.filter((n) => n.title.toLowerCase().includes(q))
    : null;
  const roots = notes.filter((n) => !n.parentId);

  return (
    <div className="space-y-0.5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() =>
            startTransition(async () => {
              const id = await createNote({});
              router.push(`/notes/${id}`);
            })
          }
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> New page
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages…"
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {matches ? (
        matches.length ? (
          matches.map((n) => (
            <Link
              key={n.id}
              href={`/notes/${n.id}`}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <span>{n.icon}</span>
              <span className="truncate">{n.title}</span>
            </Link>
          ))
        ) : (
          <p className="px-2 py-4 text-sm text-muted-foreground">No matches.</p>
        )
      ) : (
        roots.map((n) => <TreeRow key={n.id} node={n} all={notes} depth={0} />)
      )}
      {roots.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No pages yet — create your first one.
        </p>
      )}
    </div>
  );
}

function TreeRow({
  node,
  all,
  depth,
}: {
  node: NoteNode;
  all: NoteNode[];
  depth: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(depth < 1);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const children = all.filter((n) => n.parentId === node.id);
  const active = pathname === `/notes/${node.id}`;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 transition-colors",
          active ? "bg-accent" : "hover:bg-accent/50",
          pending && "opacity-50"
        )}
        style={{ paddingLeft: depth * 16 }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Toggle children"
        >
          {children.length ? (
            open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="block h-3.5 w-3.5" />
          )}
        </button>
        <Link
          href={`/notes/${node.id}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-sm"
        >
          <span className="shrink-0">{node.icon}</span>
          <span className="truncate">{node.title}</span>
        </Link>
        <button
          onClick={() =>
            startTransition(async () => {
              const id = await createNote({ parentId: node.id });
              router.push(`/notes/${id}`);
            })
          }
          className="hidden rounded p-1 text-muted-foreground hover:text-foreground group-hover:block touch:block"
          aria-label="Add subpage"
        >
          <FilePlus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={async () => {
            const ok = await confirm({
              title: `Delete "${node.title}"?`,
              description: "All its subpages are deleted too.",
              confirmLabel: "Delete",
              danger: true,
            });
            if (ok) startTransition(() => deleteNote(node.id));
          }}
          className="hidden rounded p-1 text-muted-foreground hover:text-red-500 group-hover:block touch:block"
          aria-label="Delete page"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {open &&
        children.map((c) => (
          <TreeRow key={c.id} node={c} all={all} depth={depth + 1} />
        ))}
    </div>
  );
}
