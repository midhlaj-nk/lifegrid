"use client";

import dynamic from "next/dynamic";

// Univer is browser-only and heavy — load it client-side on demand
const SheetEditor = dynamic(
  () => import("./sheet-editor").then((m) => m.SheetEditor),
  {
    ssr: false,
    loading: () => (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading spreadsheet engine…
      </p>
    ),
  }
);

export function SheetEditorShell(props: {
  sheetId: string;
  name: string;
  data: string;
}) {
  return <SheetEditor {...props} />;
}
