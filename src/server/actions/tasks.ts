"use server";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { NewTask } from "@/types";

export async function createTask(data: Omit<NewTask, "id" | "createdAt" | "updatedAt">) {
  const result = await db.insert(tasks).values(data).returning();
  revalidatePath("/tasks");
  revalidatePath("/focus");
  return result[0];
}

export async function updateTask(
  id: number,
  data: Partial<Omit<NewTask, "id" | "createdAt">>
) {
  const result = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id))
    .returning();
  revalidatePath("/tasks");
  revalidatePath("/focus");
  return result[0];
}

export async function updateTaskField(
  id: number,
  field: string,
  value: string | number | null
) {
  const result = await db
    .update(tasks)
    .set({ [field]: value, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id))
    .returning();
  revalidatePath("/tasks");
  return result[0];
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/tasks");
  revalidatePath("/focus");
}

export async function deleteTasks(ids: number[]) {
  if (ids.length === 0) return;
  await db.delete(tasks).where(inArray(tasks.id, ids));
  revalidatePath("/tasks");
  revalidatePath("/focus");
}
