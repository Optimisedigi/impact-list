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
  revalidatePath("/timeline");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
}

function timelineActionError(error: unknown): TimelineActionResult {
  const message = error instanceof Error ? error.message : "Timeline update failed";
  console.error("Timeline action failed", { message });
  return { ok: false, error: message };
}

export async function setTimelineVisibility(id: number, show: boolean): Promise<TimelineActionResult> {
  try {
    await ensureTimelineColumns();
    const existing = await db.get<{ timelineStart: string | null }>(
      sql`SELECT timeline_start AS timelineStart FROM tasks WHERE id = ${id}`
    );
    const nextStart = show && !existing?.timelineStart ? todayLocalISO() : existing?.timelineStart ?? null;

    await db.run(sql`
      UPDATE tasks
      SET show_on_timeline = ${show ? 1 : 0}, timeline_start = ${nextStart}, updated_at = ${new Date().toISOString()}
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
