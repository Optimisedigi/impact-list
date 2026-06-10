"use server";

import { db } from "@/db";
import { todayLocalISO } from "@/lib/time-utils";
import { ensureTimelineColumns } from "@/server/timeline-schema";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type TimelineActionResult =
  | { ok: true }
  | { ok: false; error: string };

function revalidateTimelineTask(id: number): void {
  try {
    revalidatePath("/timeline");
    revalidatePath("/tasks");
    revalidatePath(`/tasks/${id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "revalidate failed";
    console.error("Timeline revalidation failed", { message });
  }
}

function timelineActionError(error: unknown): TimelineActionResult {
  const message = error instanceof Error ? error.message : "Timeline update failed";
  console.error("Timeline action failed", { message });
  return { ok: false, error: "Timeline update failed. Please try again." };
}

export async function setTimelineVisibility(id: number, show: boolean): Promise<TimelineActionResult> {
  try {
    await ensureTimelineColumns();
    const nextStart = show ? todayLocalISO() : null;

    await db.run(sql`
      UPDATE tasks
      SET
        show_on_timeline = ${show ? 1 : 0},
        timeline_start = CASE
          WHEN ${show ? 1 : 0} = 1 THEN COALESCE(timeline_start, ${nextStart})
          ELSE timeline_start
        END,
        updated_at = ${new Date().toISOString()}
      WHERE id = ${id}
    `);

    revalidateTimelineTask(id);
    return { ok: true };
  } catch (error) {
    return timelineActionError(error);
  }
}

export async function updateTimelineDates(
  id: number,
  start: string | null,
  end: string | null
): Promise<TimelineActionResult> {
  try {
    await ensureTimelineColumns();
    await db.run(sql`
      UPDATE tasks
      SET timeline_start = ${start}, timeline_end = ${end}, updated_at = ${new Date().toISOString()}
      WHERE id = ${id}
    `);

    revalidateTimelineTask(id);
    return { ok: true };
  } catch (error) {
    return timelineActionError(error);
  }
}
