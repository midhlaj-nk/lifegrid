"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import { createSheet, deleteSheet, renameSheet } from "@/actions/sheets";
import { useConfirm } from "@/components/ui/app-dialog";
import { cn } from "@/lib/utils";

interface SheetRow {
  id: string;
  name: string;
  updatedAt: string;
}

export function SheetsList({ sheets }: { sheets: SheetRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const confirm = useConfirm();

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Sheets</h1>
        <button
          onClick={() =>
            startTransition(async () => {
              const id = await createSheet();
              router.push(`/sheets/${id}`);
            })
          }
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> New sheet
        </button>
      </header>

      {sheets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No spreadsheets yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sheets.map((s) => (
            <div
              key={s.id}
              className={cn(
                "group rounded-lg border border-border bg-card p-3 transition-shadow hover:shadow-md",
                pending && "opacity-60"
              )}
            >
              <div className="flex items-start gap-2.5">
                <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="min-w-0 flex-1">
                  {renaming === s.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        startTransition(async () => {
                          await renameSheet(s.id, renameValue);
                          setRenaming(null);
                        });
                      }}
                    >
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => setRenaming(null)}
                        className="h-7 w-full rounded border border-input bg-background px-2 text-sm outline-none"
                      />
                    </form>
                  ) : (
                    <Link href={`/sheets/${s.id}`} className="block">
                      <p className="truncate text-sm font-medium hover:underline">
                        {s.name}
                      </p>
                    </Link>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(s.updatedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRenaming(s.id);
                    setRenameValue(s.name);
                  }}
                  className="hidden rounded p-1 text-muted-foreground hover:text-foreground group-hover:block touch:block"
                  aria-label="Rename sheet"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Delete sheet "${s.name}"?`,
                      confirmLabel: "Delete",
                      danger: true,
                    });
                    if (ok) startTransition(() => deleteSheet(s.id));
                  }}
                  className="hidden rounded p-1 text-muted-foreground hover:text-red-500 group-hover:block touch:block"
                  aria-label="Delete sheet"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
