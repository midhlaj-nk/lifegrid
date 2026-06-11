export interface KanbanColumn {
  key: string;
  label: string;
}

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { key: "todo", label: "To do" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
];

export function parseKanbanColumns(raw: string | null | undefined): KanbanColumn[] {
  if (!raw) return DEFAULT_COLUMNS;
  try {
    const cols = JSON.parse(raw) as KanbanColumn[];
    if (!Array.isArray(cols) || !cols.length) return DEFAULT_COLUMNS;
    // "done" column is always present and last — completing lives there
    const withoutDone = cols.filter((c) => c.key !== "done");
    const done = cols.find((c) => c.key === "done") ?? { key: "done", label: "Done" };
    return [...withoutDone, done];
  } catch {
    return DEFAULT_COLUMNS;
  }
}

/** Which column a task belongs to, with legacy/status fallback. */
export function taskColumn(
  task: { status: string; kanbanColumn: string | null },
  columns: KanbanColumn[]
): string {
  if (task.status === "done") return "done";
  if (task.kanbanColumn && columns.some((c) => c.key === task.kanbanColumn)) {
    return task.kanbanColumn;
  }
  if (columns.some((c) => c.key === task.status)) return task.status;
  return columns[0]?.key ?? "todo";
}
