"use client";

import { CoverHeader } from "@/components/cover-header";
import { updateNote } from "@/actions/notes";
import { updateArea, updateProject } from "@/actions/organize";

export function NoteCover({ noteId, cover }: { noteId: string; cover: string }) {
  return (
    <CoverHeader cover={cover} onChange={(c) => updateNote(noteId, { cover: c })} />
  );
}

export function ProjectCover({
  projectId,
  cover,
}: {
  projectId: string;
  cover: string;
}) {
  return (
    <CoverHeader
      cover={cover}
      compact
      onChange={(c) => updateProject(projectId, { cover: c })}
    />
  );
}

export function AreaCover({ areaId, cover }: { areaId: string; cover: string }) {
  return (
    <CoverHeader
      cover={cover}
      compact
      onChange={(c) => updateArea(areaId, { cover: c })}
    />
  );
}
