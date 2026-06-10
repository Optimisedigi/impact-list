import { db } from "@/db";
import { tasks } from "@/db/schema";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { Task } from "@/types";

const timelineFallbackSelect = `
  SELECT
    id,
    title,
    description,
    category,
    status,
    to_complete AS toComplete,
    client,
    deadline,
    NULL AS timelineStart,
    NULL AS timelineEnd,
    false AS showOnTimeline,
    estimated_hours AS estimatedHours,
    actual_hours AS actualHours,
    priority_score AS priorityScore,
    leverage_score AS leverageScore,
    sequence_reason AS sequenceReason,
    growth_phase_id AS growthPhaseId,
    completed_at AS completedAt,
    recurring_task_id AS recurringTaskId,
    dismissed_from_focus AS dismissedFromFocus,
    notes,
    sort_order AS sortOrder,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM tasks
`;

async function getTimelineFallbackTasks(): Promise<Task[]> {
  return db.all<Task>(`${timelineFallbackSelect} ORDER BY sort_order ASC, title ASC`);
}

export async function getTimelineTasks(): Promise<Task[]> {
  try {
    return await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.showOnTimeline, true), isNotNull(tasks.timelineStart)))
      .orderBy(asc(tasks.timelineStart), asc(tasks.timelineEnd), asc(tasks.sortOrder));
  } catch {
    return [];
  }
}

export async function getTimelineCandidateTasks(): Promise<Task[]> {
  try {
    return await db.select().from(tasks).orderBy(asc(tasks.sortOrder), asc(tasks.title));
  } catch {
    return getTimelineFallbackTasks();
  }
}
