import { db } from "@/db";
import { areas, projects, tags, tasks, taskTags } from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";

export type TaskRow = typeof tasks.$inferSelect;
export type TagRow = typeof tags.$inferSelect;

export interface TaskWithMeta extends TaskRow {
  tags: TagRow[];
  subtasks: TaskRow[];
  projectName: string | null;
  projectColor: string | null;
}

export async function getSidebarData(userId: string) {
  const [areaRows, projectRows, tagRows] = await Promise.all([
    db
      .select()
      .from(areas)
      .where(eq(areas.userId, userId))
      .orderBy(asc(areas.sortOrder), asc(areas.createdAt)),
    db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.archived, false)))
      .orderBy(asc(projects.sortOrder), asc(projects.createdAt)),
    db.select().from(tags).where(eq(tags.userId, userId)).orderBy(asc(tags.name)),
  ]);
  return { areas: areaRows, projects: projectRows, tags: tagRows };
}

async function attachMeta(
  userId: string,
  rows: TaskRow[]
): Promise<TaskWithMeta[]> {
  const parents = rows.filter((t) => !t.parentId);
  const ids = parents.map((t) => t.id);
  if (!ids.length) return [];

  const [tagLinks, subtaskRows, projectRows] = await Promise.all([
    db
      .select({ taskId: taskTags.taskId, tag: tags })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(inArray(taskTags.taskId, ids)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.parentId, ids)))
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt)),
    db.select().from(projects).where(eq(projects.userId, userId)),
  ]);

  const projectById = new Map(projectRows.map((p) => [p.id, p]));

  const tagsByTask = new Map<string, TagRow[]>();
  for (const l of tagLinks) {
    const arr = tagsByTask.get(l.taskId) ?? [];
    arr.push(l.tag);
    tagsByTask.set(l.taskId, arr);
  }
  const subtasksByParent = new Map<string, TaskRow[]>();
  for (const s of subtaskRows) {
    if (!s.parentId) continue;
    const arr = subtasksByParent.get(s.parentId) ?? [];
    arr.push(s);
    subtasksByParent.set(s.parentId, arr);
  }

  return parents.map((t) => ({
    ...t,
    tags: tagsByTask.get(t.id) ?? [],
    subtasks: subtasksByParent.get(t.id) ?? [],
    projectName: t.projectId
      ? (projectById.get(t.projectId)?.name ?? null)
      : null,
    projectColor: t.projectId
      ? (projectById.get(t.projectId)?.color ?? null)
      : null,
  }));
}

/** Fetch one task fully hydrated (tags, subtasks, project meta). */
export async function getTaskById(
  userId: string,
  id: string
): Promise<TaskWithMeta | null> {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  if (!row) return null;
  const [tagLinks, subs] = await Promise.all([
    db
      .select({ tag: tags })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(eq(taskTags.taskId, id)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.parentId, id)))
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt)),
  ]);
  let projectName: string | null = null;
  let projectColor: string | null = null;
  if (row.projectId) {
    const [p] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, row.projectId));
    projectName = p?.name ?? null;
    projectColor = p?.color ?? null;
  }
  return {
    ...row,
    tags: tagLinks.map((l) => l.tag),
    subtasks: subs,
    projectName,
    projectColor,
  };
}

export async function getAllOpenTasks(userId: string) {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.priority), asc(tasks.dueDate), asc(tasks.createdAt));
  return attachMeta(userId, rows);
}

export async function getProjectTasks(userId: string, projectId: string) {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.projectId, projectId)))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
  return attachMeta(userId, rows);
}

export async function getAreaTasks(userId: string, areaId: string) {
  const areaProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.areaId, areaId)));
  const projectIds = areaProjects.map((p) => p.id);

  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        projectIds.length
          ? // tasks directly in area OR in its projects
            inArray(tasks.projectId, projectIds)
          : eq(tasks.areaId, areaId)
      )
    )
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

  const direct = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.areaId, areaId)))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

  const seen = new Set<string>();
  const merged = [...rows, ...direct].filter((t) =>
    seen.has(t.id) ? false : (seen.add(t.id), true)
  );
  return attachMeta(userId, merged);
}

export async function getTagTasks(userId: string, tagId: string) {
  const links = await db
    .select({ taskId: taskTags.taskId })
    .from(taskTags)
    .where(eq(taskTags.tagId, tagId));
  const ids = links.map((l) => l.taskId);
  if (!ids.length) return [];
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), inArray(tasks.id, ids)))
    .orderBy(asc(tasks.priority), asc(tasks.createdAt));
  return attachMeta(userId, rows);
}
