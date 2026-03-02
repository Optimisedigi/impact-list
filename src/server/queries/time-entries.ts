import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function getTimeEntriesForTask(taskId: number) {
  return db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.taskId, taskId));
}

export async function getTimeEntriesByDateRange(start: string, end: string) {
  return db
    .select()
    .from(timeEntries)
    .where(and(gte(timeEntries.date, start), lte(timeEntries.date, end)));
}
