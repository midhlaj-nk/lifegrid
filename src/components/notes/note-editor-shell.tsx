"use client";

import dynamic from "next/dynamic";

// BlockNote's useCreateBlockNote touches `window` at init — must not SSR.
const NoteEditor = dynamic(
  () => import("./note-editor").then((m) => m.NoteEditor),
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
}) {
  return <NoteEditor {...props} />;
}
