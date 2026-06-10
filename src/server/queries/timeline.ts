import { db } from "@/db";
import { tasks } from "@/db/schema";
import { ensureTimelineColumns } from "@/server/timeline-schema";
import { and, asc, eq, isNotNull } from "drizzle-orm";

export async function getTimelineTasks() {
  await ensureTimelineColumns();
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.showOnTimeline, true), isNotNull(tasks.timelineStart)))
    .orderBy(asc(tasks.timelineStart), asc(tasks.timelineEnd), asc(tasks.sortOrder));
}

export async function getTimelineCandidateTasks() {
  await ensureTimelineColumns();
  return db.select().from(tasks).orderBy(asc(tasks.sortOrder), asc(tasks.title));
}
