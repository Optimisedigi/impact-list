"use server";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, inArray, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { NewTask } from "@/types";

export async function createTask(data: Omit<NewTask, "id" | "createdAt" | "updatedAt">) {
  // Get the current max sortOrder so new tasks appear at the bottom of the list
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(tasks.sortOrder) })
    .from(tasks);
  const nextOrder = (maxOrder ?? 0) + 1;

  const result = await db
    .insert(tasks)
    .values({ ...data, sortOrder: nextOrder })
    .returning();
  revalidatePath("/tasks");
  revalidatePath("/focus");
  return result[0];
}

export async function updateTask(
  id: number,
  data: Partial<Omit<NewTask, "id" | "createdAt">>
) {
  const updates = {
    ...data,
    updatedAt: new Date().toISOString(),
    ...(data.status === "done" ? { completedAt: new Date().toISOString() } : {}),
    ...(data.status && data.status !== "done" ? { completedAt: null } : {}),
  };
  const result = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))
    .returning();
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/focus");
  return result[0];
}

export async function updateTaskNotes(id: number, notes: string) {
  const result = await db
    .update(tasks)
    .set({ notes, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id))
    .returning();
  revalidatePath(`/tasks/${id}`);
  return result[0];
}

export async function updateTaskField(
  id: number,
  field: string,
  value: string | number | null
) {
  const updates: Record<string, unknown> = {
    [field]: value,
    updatedAt: new Date().toISOString(),
  };

  // Auto-set completedAt when status changes
  if (field === "status") {
    updates.completedAt = value === "done" ? new Date().toISOString() : null;
  }

  const result = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))
    .returning();

  // When a recurring task is marked done, generate the next instance immediately
  if (field === "status" && value === "done" && result[0]?.recurringTaskId) {
    const { regenerateRecurringTask } = await import("./recurring-tasks");
    await regenerateRecurringTask(result[0].recurringTaskId);
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/analytics");
  revalidatePath("/focus");
  return result[0];
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/tasks");
  revalidatePath("/focus");
  revalidatePath("/analytics");
}

export async function deleteTasks(ids: number[]) {
  if (ids.length === 0) return;
  await db.delete(tasks).where(inArray(tasks.id, ids));
  revalidatePath("/tasks");
  revalidatePath("/focus");
}

export async function duplicateTasks(ids: number[]) {
  if (ids.length === 0) return [];
  const originals = await db.select().from(tasks).where(inArray(tasks.id, ids));
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(tasks.sortOrder) })
    .from(tasks);
  let nextOrder = (maxOrder ?? 0) + 1;
  const newTasks = originals.map((t) => ({
    title: t.title,
    category: t.category,
    status: t.status,
    toComplete: t.toComplete,
    client: t.client,
    deadline: t.deadline,
    estimatedHours: t.estimatedHours,
    description: t.description,
    priorityScore: null,
    leverageScore: null,
    sequenceReason: null,
    actualHours: null,
    completedAt: null,
    sortOrder: nextOrder++,
  }));
  const result = await db.insert(tasks).values(newTasks).returning();
  revalidatePath("/tasks");
  revalidatePath("/focus");
  return result;
}

export async function createFocusTask(input: {
  title: string;
  category: string;
  position: number;
  existingIds: number[];
}) {
  const title = input.title.trim();
  if (!title) return null;

  // Full this-week ordering (includes tasks hidden from the visible queue,
  // e.g. top-priority cards) so renumbering can't collide with their sortOrder
  const { getThisWeekTasks } = await import("@/server/queries/analytics");
  const allIds = (await getThisWeekTasks()).map((t) => t.id);

  const [created] = await db
    .insert(tasks)
    .values({ title, category: input.category, status: "not_started", toComplete: "this_week", sortOrder: 0 })
    .returning();

  // Insert the new task into the full ordering right before the task currently
  // at the requested position (or at the bottom); existing tasks keep their order
  const pos = Math.max(0, Math.min(input.position, input.existingIds.length));
  const beforeId = input.existingIds[pos];
  const finalIds: number[] = [];
  for (const id of allIds) {
    if (id === beforeId) finalIds.push(created.id);
    finalIds.push(id);
  }
  if (beforeId === undefined || !allIds.includes(beforeId)) finalIds.push(created.id);
  for (let i = 0; i < finalIds.length; i++) {
    await db.update(tasks).set({ sortOrder: i + 1 }).where(eq(tasks.id, finalIds[i]));
  }

  revalidatePath("/focus");
  revalidatePath("/tasks");
  return created;
}

export async function reorderFocusTasks(orderedIds: number[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(tasks)
      .set({ sortOrder: i + 1 })
      .where(eq(tasks.id, orderedIds[i]));
  }
  revalidatePath("/focus");
}

export async function promoteToTopPriority(id: number) {
  await db
    .update(tasks)
    .set({ toComplete: "today", dismissedFromFocus: null })
    .where(eq(tasks.id, id));
  revalidatePath("/focus");
}

/**
 * Promote a task into the Top Priority cards at a specific slot.
 * Top cards are ordered by sortOrder first, so the task is spliced into the
 * current top ordering at `slotIndex` and the whole focus list is renumbered.
 */
export async function promoteToTopPriorityAt(id: number, slotIndex: number, topIds: number[]) {
  await db
    .update(tasks)
    .set({ toComplete: "today", dismissedFromFocus: null })
    .where(eq(tasks.id, id));

  const ordered = topIds.filter((tid) => tid !== id);
  const slot = Math.max(0, Math.min(slotIndex, ordered.length));
  ordered.splice(slot, 0, id);

  const { getThisWeekTasks } = await import("@/server/queries/analytics");
  const restIds = (await getThisWeekTasks())
    .map((t) => t.id)
    .filter((tid) => !ordered.includes(tid));

  const finalIds = [...ordered, ...restIds];
  for (let i = 0; i < finalIds.length; i++) {
    await db.update(tasks).set({ sortOrder: i + 1 }).where(eq(tasks.id, finalIds[i]));
  }

  revalidatePath("/focus");
}

export async function dismissFromFocus(id: number) {
  await db
    .update(tasks)
    .set({ dismissedFromFocus: new Date().toISOString() })
    .where(eq(tasks.id, id));
  revalidatePath("/focus");
}

export async function bulkUpdateField(
  ids: number[],
  field: string,
  value: string | number | null
) {
  if (ids.length === 0) return;
  const updates: Record<string, unknown> = {
    [field]: value,
    updatedAt: new Date().toISOString(),
  };
  if (field === "status") {
    updates.completedAt = value === "done" ? new Date().toISOString() : null;
  }
  await db.update(tasks).set(updates).where(inArray(tasks.id, ids));
  revalidatePath("/tasks");
  revalidatePath("/focus");
}
