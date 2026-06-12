"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FolderInput, ImagePlus, Link2, PenTool, FileText, Search, SmilePlus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { updateNote, linkNoteToTask, unlinkNoteFromTask } from "@/actions/notes";
import { AppModal } from "@/components/ui/app-dialog";
import { cn } from "@/lib/utils";
import { COVER_GRADIENTS, coverStyle } from "@/components/cover-header";

const EmojiPickerReact = dynamic(() => import("emoji-picker-react"), { ssr: false });

export function ModeToggle({
  noteId,
  mode,
}: {
  noteId: string;
  mode: "page" | "canvas";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("flex rounded-md border border-border p-0.5", pending && "opacity-50")}>
      {(
        [
          { key: "page", label: "Page", icon: FileText },
          { key: "canvas", label: "Canvas", icon: PenTool },
        ] as const
      ).map((m) => (
        <button
          key={m.key}
          onClick={() =>
            startTransition(async () => {
              await updateNote(noteId, { mode: m.key });
              router.refresh();
            })
          }
          className={cn(
            "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px]",
            mode === m.key ? "bg-accent font-medium" : "text-muted-foreground"
          )}
        >
          <m.icon className="h-3 w-3" />
          {m.label}
        </button>
      ))}
    </div>
  );
}

export function MoveNoteButton({
  noteId,
  allNotes,
}: {
  noteId: string;
  allNotes: { id: string; title: string; icon: string; parentId: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // exclude self and its descendants as move targets
  const blocked = new Set([noteId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of allNotes) {
      if (n.parentId && blocked.has(n.parentId) && !blocked.has(n.id)) {
        blocked.add(n.id);
        grew = true;
      }
    }
  }
  const targets = allNotes.filter((n) => !blocked.has(n.id));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <FolderInput className="h-3 w-3" /> Move
      </button>
      <AppModal open={open} onClose={() => setOpen(false)} title="Move page to…">
        <div className={cn("max-h-72 space-y-0.5 overflow-y-auto", pending && "opacity-50")}>
          <button
            onClick={() =>
              startTransition(async () => {
                await updateNote(noteId, { parentId: null });
                setOpen(false);
                router.refresh();
              })
            }
            className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            ⬆️ Top level
          </button>
          {targets.map((n) => (
            <button
              key={n.id}
              onClick={() =>
                startTransition(async () => {
                  await updateNote(noteId, { parentId: n.id });
                  setOpen(false);
                  router.refresh();
                })
              }
              className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              {n.icon} {n.title}
            </button>
          ))}
        </div>
      </AppModal>
    </>
  );
}

function EmojiPicker({ onPick, onRemove }: { onPick: (e: string) => void; onRemove: () => void }) {
  return (
    <div className="animate-scale-in absolute left-0 top-full z-20 mt-1 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
      <EmojiPickerReact
        onEmojiClick={(data) => onPick(data.emoji)}
        height={380}
        width={320}
        searchPlaceholder="Search emoji…"
        lazyLoadEmojis
      />
      <div className="border-t border-border px-3 py-2">
        <button
          onClick={onRemove}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
        >
          <X className="h-3 w-3" /> Remove icon
        </button>
      </div>
    </div>
  );
}

type UnsplashPhoto = { id: string; regular: string; small: string; credit: string };

function CoverPicker({
  onPick,
  onUpload,
  onRemove,
  uploading,
}: {
  onPick: (c: string) => void;
  onUpload: () => void;
  onRemove: () => void;
  uploading: boolean;
}) {
  const [tab, setTab] = useState<"gradients" | "photos">("gradients");
  const [query, setQuery] = useState("nature");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [searching, setSearching] = useState(false);
  const [noKey, setNoKey] = useState(false);

  const search = useCallback(async (q: string) => {
    setSearching(true);
    setNoKey(false);
    try {
      const res = await fetch(`/api/unsplash?q=${encodeURIComponent(q)}`);
      if (res.status === 503) { setNoKey(true); return; }
      const data = await res.json();
      setPhotos(data.photos ?? []);
    } catch {
      toast.error("Photo search failed");
    } finally {
      setSearching(false);
    }
  }, []);

  const switchToPhotos = useCallback(() => {
    setTab("photos");
    if (photos.length === 0) search(query);
  }, [photos.length, query, search]);

  return (
    <div className="animate-scale-in absolute right-3 top-full z-20 mt-1 w-80 rounded-xl border border-border bg-popover shadow-xl">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border px-3 pt-2">
        {(["gradients", "photos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => t === "photos" ? switchToPhotos() : setTab(t)}
            className={cn(
              "rounded-t px-3 py-1.5 text-[11px] font-medium capitalize",
              tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-3">
        {tab === "gradients" && (
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(COVER_GRADIENTS).map(([key, css]) => (
              <button
                key={key}
                onClick={() => onPick(key)}
                className="h-10 rounded-lg transition-transform hover:scale-105"
                style={{ backgroundImage: css }}
                aria-label={key}
              />
            ))}
          </div>
        )}

        {tab === "photos" && (
          <div className="space-y-2">
            {noKey ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Add <code className="rounded bg-muted px-1">UNSPLASH_ACCESS_KEY</code> to <code className="rounded bg-muted px-1">.env.local</code> to enable photo search.
              </p>
            ) : (
              <>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && search(query)}
                      placeholder="Search photos…"
                      className="h-7 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <button
                    onClick={() => search(query)}
                    disabled={searching}
                    className="h-7 rounded-md border border-border px-2.5 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    {searching ? "…" : "Go"}
                  </button>
                </div>
                <div className="grid max-h-52 grid-cols-2 gap-1.5 overflow-y-auto">
                  {photos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onPick(p.regular)}
                      className="group relative h-16 overflow-hidden rounded-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.small} alt={p.credit} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      <span className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-1 py-0.5 text-[9px] text-white opacity-0 group-hover:opacity-100">
                        {p.credit}
                      </span>
                    </button>
                  ))}
                  {!searching && photos.length === 0 && (
                    <p className="col-span-2 py-6 text-center text-xs text-muted-foreground">No results</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <button
            onClick={onUpload}
            disabled={uploading}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border text-xs hover:bg-accent disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Upload image"}
          </button>
          <button
            onClick={onRemove}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border px-3 text-xs text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotionPageHeader({
  noteId,
  initialTitle,
  initialIcon,
  initialCover,
}: {
  noteId: string;
  initialTitle: string;
  initialIcon: string;
  initialCover: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState(initialIcon);
  const [cover, setCover] = useState(initialCover);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [pickingCover, setPickingCover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasCover = !!cover;
  const style = coverStyle(cover);

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setCover(url);
      await updateNote(noteId, { cover: url });
      setPickingCover(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="group/page">
      {/* ── Cover ── */}
      {hasCover ? (
        <div className="relative -mx-3 -mt-4 md:-mx-8">
          <div className="h-44 w-full md:h-56" style={style ?? undefined} />
          {/* Change / remove cover — bottom-right on hover */}
          <div className="absolute bottom-3 right-3 hidden gap-1.5 group-hover/page:flex">
            <button
              onClick={() => setPickingCover((v) => !v)}
              className="rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/70"
            >
              Change cover
            </button>
          </div>
          {pickingCover && (
            <CoverPicker
              onPick={(c) => { setCover(c); updateNote(noteId, { cover: c }); setPickingCover(false); }}
              onUpload={() => fileRef.current?.click()}
              onRemove={() => { setCover(""); updateNote(noteId, { cover: "" }); setPickingCover(false); }}
              uploading={uploading}
            />
          )}
        </div>
      ) : null}

      {/* ── Icon + action buttons area ── */}
      <div className={cn("relative mx-auto max-w-3xl px-3 md:px-8", hasCover ? "-mt-8" : "mt-6")}>
        {/* Large Notion-style icon */}
        {icon ? (
          <div className="relative mb-3 inline-block">
            <button
              onClick={() => { setPickingIcon((v) => !v); setPickingCover(false); }}
              className="block rounded-xl p-1 text-[4.5rem] leading-none transition-transform hover:scale-105 hover:bg-accent/30"
              aria-label="Change icon"
            >
              {icon}
            </button>
            {pickingIcon && (
              <EmojiPicker
                onPick={(e) => { setIcon(e); setPickingIcon(false); updateNote(noteId, { icon: e }); }}
                onRemove={() => { setIcon(""); setPickingIcon(false); updateNote(noteId, { icon: "" }); }}
              />
            )}
          </div>
        ) : null}

        {/* "Add icon" / "Add cover" — shown on hover when missing */}
        <div className="mb-2 flex flex-wrap gap-2 opacity-0 transition-opacity group-hover/page:opacity-100">
          {!icon && (
            <button
              onClick={() => { setPickingIcon(true); setPickingCover(false); }}
              className="relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              <SmilePlus className="h-3.5 w-3.5" /> Add icon
              {pickingIcon && (
                <EmojiPicker
                  onPick={(e) => { setIcon(e); setPickingIcon(false); updateNote(noteId, { icon: e }); }}
                  onRemove={() => { setIcon(""); setPickingIcon(false); updateNote(noteId, { icon: "" }); }}
                />
              )}
            </button>
          )}
          {!hasCover && (
            <button
              onClick={() => { setPickingCover((v) => !v); setPickingIcon(false); }}
              className="relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              <ImagePlus className="h-3.5 w-3.5" /> Add cover
              {pickingCover && (
                <CoverPicker
                  onPick={(c) => { setCover(c); updateNote(noteId, { cover: c }); setPickingCover(false); }}
                  onUpload={() => fileRef.current?.click()}
                  onRemove={() => { setCover(""); updateNote(noteId, { cover: "" }); setPickingCover(false); }}
                  uploading={uploading}
                />
              )}
            </button>
          )}
        </div>

        {/* Title — large H1 style */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => updateNote(noteId, { title: title.trim() || "Untitled" })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="Untitled"
          className="w-full bg-transparent text-[2rem] font-bold leading-tight tracking-tight outline-none placeholder:text-muted-foreground/30 md:text-[2.5rem]"
        />
      </div>

      {/* Hidden file input for cover upload */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }}
      />
    </div>
  );
}

interface TaskOption {
  id: string;
  title: string;
  status: string;
}

export function LinkedTasks({
  noteId,
  linked,
  allTasks,
}: {
  noteId: string;
  linked: TaskOption[];
  allTasks: TaskOption[];
}) {
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const linkedIds = new Set(linked.map((t) => t.id));
  const candidates = allTasks
    .filter((t) => !linkedIds.has(t.id))
    .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", pending && "opacity-60")}>
      {linked.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
        >
          <Link2 className="h-3 w-3 text-muted-foreground" />
          <span className={cn(t.status === "done" && "line-through text-muted-foreground")}>
            {t.title}
          </span>
          <button
            onClick={() => startTransition(() => unlinkNoteFromTask(noteId, t.id))}
            className="text-muted-foreground hover:text-red-500"
            aria-label="Unlink task"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {picking ? (
        <div className="relative">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setTimeout(() => setPicking(false), 200)}
            placeholder="Search tasks…"
            className="h-7 w-48 rounded-full border border-border bg-background px-3 text-xs outline-none"
          />
          {candidates.length > 0 && (
            <div className="absolute top-8 z-10 w-64 rounded-md border border-border bg-popover p-1 shadow-md">
              {candidates.map((t) => (
                <button
                  key={t.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setPicking(false);
                    setQuery("");
                    startTransition(() => linkNoteToTask(noteId, t.id));
                  }}
                  className="block w-full truncate rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setPicking(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Link2 className="h-3 w-3" /> Link task
        </button>
      )}
    </div>
  );
}
