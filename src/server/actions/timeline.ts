"use server";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { todayLocalISO } from "@/lib/time-utils";
import { ensureTimelineColumns } from "@/server/timeline-schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function revalidateTimelineTask(id: number): void {
  revalidatePath("/timeline");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
}

export async function setTimelineVisibility(id: number, show: boolean) {
  await ensureTimelineColumns();
  const existing = await db
    .select({ timelineStart: tasks.timelineStart })
    .from(tasks)
    .where(eq(tasks.id, id));

  const result = await db
    .update(tasks)
    .set({
      showOnTimeline: show,
      timelineStart: show && !existing[0]?.timelineStart ? todayLocalISO() : existing[0]?.timelineStart,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tasks.id, id))
    .returning();

  revalidateTimelineTask(id);
  return result[0];
}

export async function updateTimelineDates(
  id: number,
  start: string | null,
  end: string | null
) {
  await ensureTimelineColumns();
  const result = await db
    .update(tasks)
    .set({
      timelineStart: start,
      timelineEnd: end,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tasks.id, id))
    .returning();

  revalidateTimelineTask(id);
  return result[0];
}
