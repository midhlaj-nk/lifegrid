"use server";

import { db } from "@/db";
import { areas, projects, tags } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

const name = z.string().min(1).max(100);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export async function createArea(input: { name: string; color?: string; icon?: string }) {
  const user = await requireUser();
  const id = randomUUID();
  await db.insert(areas).values({
    id,
    userId: user.id,
    name: name.parse(input.name),
    color: input.color ? color.parse(input.color) : "#6366f1",
    icon: input.icon ?? "folder",
  });
  revalidatePath("/", "layout");
  return id;
}

export async function updateArea(id: string, input: { name?: string; color?: string; icon?: string; cover?: string }) {
  const user = await requireUser();
  await db
    .update(areas)
    .set({
      ...(input.name ? { name: name.parse(input.name) } : {}),
      ...(input.color ? { color: color.parse(input.color) } : {}),
      ...(input.icon ? { icon: input.icon } : {}),
      ...(input.cover !== undefined ? { cover: input.cover } : {}),
    })
    .where(and(eq(areas.id, id), eq(areas.userId, user.id)));
  revalidatePath("/", "layout");
}

export async function deleteArea(id: string) {
  const user = await requireUser();
  await db.delete(areas).where(and(eq(areas.id, id), eq(areas.userId, user.id)));
  revalidatePath("/", "layout");
}

export async function createProject(input: { name: string; areaId?: string | null; color?: string }) {
  const user = await requireUser();
  const id = randomUUID();
  await db.insert(projects).values({
    id,
    userId: user.id,
    name: name.parse(input.name),
    areaId: input.areaId ?? null,
    color: input.color ? color.parse(input.color) : "#8b5cf6",
  });
  revalidatePath("/", "layout");
  return id;
}

export async function updateProject(id: string, input: { name?: string; areaId?: string | null; color?: string; archived?: boolean; kanbanColumns?: string; cover?: string }) {
  const user = await requireUser();
  await db
    .update(projects)
    .set({
      ...(input.name ? { name: name.parse(input.name) } : {}),
      ...(input.color ? { color: color.parse(input.color) } : {}),
      ...(input.areaId !== undefined ? { areaId: input.areaId } : {}),
      ...(input.archived !== undefined ? { archived: input.archived } : {}),
      ...(input.kanbanColumns !== undefined ? { kanbanColumns: input.kanbanColumns } : {}),
      ...(input.cover !== undefined ? { cover: input.cover } : {}),
    })
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)));
  revalidatePath("/", "layout");
}

export async function deleteProject(id: string) {
  const user = await requireUser();
  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, user.id)));
  revalidatePath("/", "layout");
}

export async function getTags() {
  const user = await requireUser();
  return db
    .select()
    .from(tags)
    .where(eq(tags.userId, user.id))
    .orderBy(asc(tags.name));
}

export async function createTag(input: { name: string; color?: string }) {
  const user = await requireUser();
  const id = randomUUID();
  await db.insert(tags).values({
    id,
    userId: user.id,
    name: name.parse(input.name),
    color: input.color ? color.parse(input.color) : "#10b981",
  });
  revalidatePath("/", "layout");
  return id;
}

export async function updateTag(id: string, input: { name?: string; color?: string }) {
  const user = await requireUser();
  await db
    .update(tags)
    .set({
      ...(input.name ? { name: name.parse(input.name) } : {}),
      ...(input.color ? { color: color.parse(input.color) } : {}),
    })
    .where(and(eq(tags.id, id), eq(tags.userId, user.id)));
  revalidatePath("/", "layout");
}

export async function deleteTag(id: string) {
  const user = await requireUser();
  await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, user.id)));
  revalidatePath("/", "layout");
}
