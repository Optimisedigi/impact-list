"use server";

import { db } from "@/db";
import { multitaskColumns } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface MultitaskColumn {
  taskId: number;
  name: string;
}

export async function getMultitaskColumns(): Promise<MultitaskColumn[]> {
  try {
    const rows = await db
      .select({ taskId: multitaskColumns.taskId, name: multitaskColumns.name })
      .from(multitaskColumns)
      .orderBy(multitaskColumns.sortOrder, multitaskColumns.id);
    return rows;
  } catch {
    return [];
  }
}

export async function addMultitaskColumn(taskId: number, name: string): Promise<void> {
  const next = await db
    .select({ max: sql<number>`COALESCE(MAX(${multitaskColumns.sortOrder}), -1)` })
    .from(multitaskColumns);
  const sortOrder = (next[0]?.max ?? -1) + 1;

  await db
    .insert(multitaskColumns)
    .values({ taskId, name, sortOrder })
    .onConflictDoNothing({ target: multitaskColumns.taskId });

  revalidatePath("/timeline");
}

export async function removeMultitaskColumn(taskId: number): Promise<void> {
  await db.delete(multitaskColumns).where(eq(multitaskColumns.taskId, taskId));
  revalidatePath("/timeline");
}

export async function renameMultitaskColumn(taskId: number, name: string): Promise<void> {
  await db
    .update(multitaskColumns)
    .set({ name, updatedAt: new Date().toISOString() })
    .where(eq(multitaskColumns.taskId, taskId));
  revalidatePath("/timeline");
}
