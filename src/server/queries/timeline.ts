import { db } from "@/db";
import type { Task } from "@/types";

export type TimelineTask = Task & {
  timelineStart: string | null;
  timelineEnd: string | null;
  showOnTimeline: boolean;
};

const baseTimelineSelect = `
  SELECT
    id,
    title,
    description,
    category,
    status,
    to_complete AS toComplete,
    client,
    deadline,
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

const fallbackTimelineSelect = `
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

export async function getTimelineTasks(): Promise<TimelineTask[]> {
  try {
    return await db.all<TimelineTask>(`
      SELECT
        id,
        title,
        description,
        category,
        status,
        to_complete AS toComplete,
        client,
        deadline,
        timeline_start AS timelineStart,
        timeline_end AS timelineEnd,
        show_on_timeline AS showOnTimeline,
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
      WHERE show_on_timeline = true AND timeline_start IS NOT NULL
      ORDER BY timeline_start ASC, timeline_end ASC, sort_order ASC
    `);
  } catch {
    return [];
  }
}

export async function getTimelineCandidateTasks(): Promise<TimelineTask[]> {
  try {
    return await db.all<TimelineTask>(`
      SELECT *, NULL AS timelineStart, NULL AS timelineEnd, false AS showOnTimeline
      FROM (${baseTimelineSelect})
      ORDER BY sortOrder ASC, title ASC
    `);
  } catch {
    return db.all<TimelineTask>(`${fallbackTimelineSelect} ORDER BY sortOrder ASC, title ASC`);
  }
}

export async function getTaskTimelineFields(taskId: number): Promise<Pick<TimelineTask, "timelineStart" | "timelineEnd" | "showOnTimeline">> {
  try {
    const row = await db.get<Pick<TimelineTask, "timelineStart" | "timelineEnd" | "showOnTimeline">>(`
      SELECT
        timeline_start AS timelineStart,
        timeline_end AS timelineEnd,
        show_on_timeline AS showOnTimeline
      FROM tasks
      WHERE id = ${taskId}
    `);
    return {
      timelineStart: row?.timelineStart ?? null,
      timelineEnd: row?.timelineEnd ?? null,
      showOnTimeline: Boolean(row?.showOnTimeline),
    };
  } catch {
    return { timelineStart: null, timelineEnd: null, showOnTimeline: false };
  }
}
