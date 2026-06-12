"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createUniver,
  LocaleType,
  mergeLocales,
  defaultTheme,
} from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/presets/preset-sheets-core";
import UniverPresetSheetsCoreEnUS from "@univerjs/presets/preset-sheets-core/locales/en-US";
import "@univerjs/presets/lib/styles/preset-sheets-core.css";
import { saveSheetData, renameSheet } from "@/actions/sheets";

export function SheetEditor({
  sheetId,
  name: initialName,
  data,
}: {
  sheetId: string;
  name: string;
  data: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ReturnType<typeof createUniver>["univerAPI"] | null>(null);
  const lastSaved = useRef<string>(data);
  const [name, setName] = useState(initialName);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");

  useEffect(() => {
    if (!containerRef.current) return;

    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS) },
      theme: defaultTheme,
      presets: [UniverSheetsCorePreset({ container: containerRef.current })],
    });
    apiRef.current = univerAPI;

    let snapshot: object | undefined;
    try {
      snapshot = data ? JSON.parse(data) : undefined;
    } catch {
      snapshot = undefined;
    }
    univerAPI.createWorkbook(snapshot ?? { name: initialName });

    // Univer captures container size at init; inside a flex layout the
    // container may still be collapsing. Nudge it to recompute once laid out.
    const resizeTicks = [50, 250, 600, 1200].map((ms) =>
      setTimeout(() => window.dispatchEvent(new Event("resize")), ms)
    );

    async function persist() {
      const wb = apiRef.current?.getActiveWorkbook();
      if (!wb) return;
      const json = JSON.stringify(wb.save());
      if (json === lastSaved.current) return;
      setSaveState("saving");
      const res = await saveSheetData(sheetId, json);
      if ("error" in res && res.error) {
        toast.error(res.error);
        setSaveState("dirty");
      } else {
        lastSaved.current = json;
        setSaveState("saved");
      }
    }

    const interval = setInterval(persist, 4000);
    const onLeave = () => {
      // best-effort sync save on tab close
      const wb = apiRef.current?.getActiveWorkbook();
      if (!wb) return;
      const json = JSON.stringify(wb.save());
      if (json !== lastSaved.current) {
        navigator.sendBeacon?.(
          "/api/sheets/beacon-save",
          new Blob([JSON.stringify({ id: sheetId, data: json })], {
            type: "application/json",
          })
        );
      }
    };
    window.addEventListener("beforeunload", onLeave);

    return () => {
      clearInterval(interval);
      resizeTicks.forEach(clearTimeout);
      window.removeEventListener("beforeunload", onLeave);
      persist();
      univer.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetId]);

  // True fullscreen: fixed overlay escaping the app shell (sidebar, header,
  // padding, bottom nav). Univer needs the whole viewport to be usable.
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Link
          href="/sheets"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          aria-label="Back to sheets"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => renameSheet(sheetId, name)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-56 bg-transparent text-sm font-semibold outline-none"
        />
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          {saveState === "saving" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Saving
            </>
          ) : (
            <>
              <Check className="h-3 w-3" /> Saved
            </>
          )}
        </span>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  );
}
