"use server";

import { db } from "@/db";
import { timeEntries, tasks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createTimeEntry(data: {
  taskId: number;
  hours: number;
  date: string;
  note?: string;
}) {
  const result = await db.insert(timeEntries).values(data).returning();

  // Update task actual hours
  await db
    .update(tasks)
    .set({
      actualHours: sql`(SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE task_id = ${data.taskId})`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tasks.id, data.taskId));

  revalidatePath("/tasks");
  revalidatePath("/focus");
  return result[0];
}

export async function quickLogHours(taskId: number, hours: number) {
  return createTimeEntry({
    taskId,
    hours,
    date: new Date().toISOString().split("T")[0],
  });
}
