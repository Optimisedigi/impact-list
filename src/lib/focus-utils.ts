import type { Task } from "@/types";
import { getWeekBounds } from "./time-utils";

export type FocusBoardCandidate = Pick<
  Task,
  "status" | "toComplete" | "deadline" | "dismissedFromFocus" | "starredAt"
>;

export interface WeekBounds {
  start: string;
  end: string;
}

/**
 * Client-side mirror of the Focus board membership rules in `getThisWeekTasks`
 * (src/server/queries/analytics.ts): a task is on the board when it is not done
 * or dismissed and either starred, marked today/this_week, or due within the
 * current week. Keep in sync with that query. (Top-priority leverage-fill cards
 * are the one case the client cannot predict.)
 */
export function isOnFocusBoard(
  task: FocusBoardCandidate,
  weekBounds: WeekBounds = getWeekBounds(0)
): boolean {
  if (task.status === "done" || task.dismissedFromFocus) return false;
  if (task.starredAt) return true;
  if (task.toComplete === "today" || task.toComplete === "this_week") return true;
  if (!task.deadline) return false;
  return task.deadline >= weekBounds.start.slice(0, 10) && task.deadline <= weekBounds.end.slice(0, 10);
}
