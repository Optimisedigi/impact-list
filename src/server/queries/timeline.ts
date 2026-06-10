import { db } from "@/db";
import { tasks } from "@/db/schema";
import { and, asc, eq, isNotNull } from "drizzle-orm";

export async function getTimelineTasks() {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.showOnTimeline, true), isNotNull(tasks.timelineStart)))
    .orderBy(asc(tasks.timelineStart), asc(tasks.timelineEnd), asc(tasks.sortOrder));
}
