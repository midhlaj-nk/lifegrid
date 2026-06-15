"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, FileText, LayoutGrid, ListTree, Plus, Search } from "lucide-react";
import { createNote } from "@/actions/notes";
import { coverStyle } from "@/components/cover-header";
import { NotesTree, type NoteNode } from "./notes-tree";
import { cn } from "@/lib/utils";

export interface LandingNote extends NoteNode {
  cover: string;
  updatedAt: string;
}

const TEMPLATES = [
  { label: "Daily Journal", icon: "📔", sections: ["Gratitude", "Wins", "Focus"] },
  { label: "Meeting Notes", icon: "📋", sections: ["Agenda", "Action Items", "Notes"] },
  { label: "Project Plan", icon: "🗺️", sections: ["Goal", "Milestones", "Tasks"] },
  { label: "Book Notes", icon: "📚", sections: ["Summary", "Key Ideas", "Quotes"] },
];

function buildTemplateContent(sections: string[]): string {
  const blocks = sections.flatMap((s) => [
    {
      id: crypto.randomUUID(),
      type: "heading",
      props: { textColor: "default", backgroundColor: "default", textAlignment: "left", level: 2 },
      content: [{ type: "text", text: s, styles: {} }],
      children: [],
    },
    {
      id: crypto.randomUUID(),
      type: "paragraph",
      props: { textColor: "default", backgroundColor: "default", textAlignment: "left" },
      content: [],
      children: [],
    },
  ]);
  return JSON.stringify(blocks);
}

export function NotesLanding({ notes }: { notes: LandingNote[] }) {
  const router = useRouter();
  const [view, setView] = useState<"gallery" | "tree">("gallery");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [showTemplates, setShowTemplates] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? notes.filter((n) => n.title.toLowerCase().includes(q))
    : notes;
  const roots = filtered.filter((n) => !n.parentId || q);

  useEffect(() => {
    if (!showTemplates) return;
    const close = () => setShowTemplates(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showTemplates]);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Notes</h1>
        <div className="flex rounded-md border border-border p-0.5">
          {(
            [
              { key: "gallery", icon: LayoutGrid },
              { key: "tree", icon: ListTree },
            ] as const
          ).map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                "rounded px-2 py-1",
                view === v.key
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground"
              )}
              aria-label={`${v.key} view`}
            >
              <v.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </header>

      {view === "tree" ? (
        <NotesTree notes={notes} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
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
            <div
              className="relative"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowTemplates((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <FileText className="h-3.5 w-3.5" /> Templates
                <ChevronDown className="h-3 w-3" />
              </button>
              {showTemplates && (
                <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-popover shadow-lg">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      disabled={pending}
                      onClick={() => {
                        setShowTemplates(false);
                        startTransition(async () => {
                          const id = await createNote({
                            title: t.label,
                            icon: t.icon,
                            content: buildTemplateContent(t.sections),
                          });
                          router.push(`/notes/${id}`);
                        });
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                    >
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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

          {roots.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              {q ? "No matches." : "No pages yet — create your first one."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {roots.map((n) => {
                const style = coverStyle(n.cover);
                const childCount = notes.filter(
                  (c) => c.parentId === n.id
                ).length;
                return (
                  <Link
                    key={n.id}
                    href={`/notes/${n.id}`}
                    className="group overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
                  >
                    <div
                      className="flex h-20 items-end p-2"
                      style={
                        style ?? {
                          background:
                            "linear-gradient(135deg, var(--accent) 0%, var(--card) 100%)",
                        }
                      }
                    >
                      <span className="text-2xl drop-shadow">{n.icon}</span>
                    </div>
                    <div className="space-y-0.5 p-2.5">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.updatedAt), {
                          addSuffix: true,
                        })}
                        {childCount > 0 &&
                          ` · ${childCount} subpage${childCount === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
