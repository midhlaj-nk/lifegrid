"use client";

import dynamic from "next/dynamic";

// Plate uses Slate which touches browser APIs — must not SSR.
const PlateEditor = dynamic(
  () => import("./plate-editor").then((m) => m.PlateEditor),
  {
    ssr: false,
    loading: () => (
      <p className="py-8 text-sm text-muted-foreground">Loading editor…</p>
    ),
  }
);

export function NoteEditorShell(props: {
  noteId: string;
  initialContent: string;
  tasks?: { id: string; title: string }[];
  notes?: { id: string; title: string; icon?: string }[];
}) {
  return <PlateEditor {...props} />;
}
