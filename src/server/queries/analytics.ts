import { db } from "@/db";
import { tasks, timeEntries } from "@/db/schema";
import { eq, and, or, gte, lte, ne, desc, asc, lt, inArray, sql, isNull } from "drizzle-orm";
import { getWeekBounds, getMonthBounds } from "@/lib/time-utils";

export type PeriodKey = "this_week" | "last_week" | "this_month" | "last_month" | "all_time";

function getBounds(period: Exclude<PeriodKey, "all_time">) {
  switch (period) {
    case "this_week": return getWeekBounds(0);
    case "last_week": return getWeekBounds(-1);
    case "this_month": return getMonthBounds(0);
    case "last_month": return getMonthBounds(-1);
  }
}

export async function getTimeAllocationByPeriod(period: PeriodKey) {
  if (period === "all_time") {
    return db
      .select({
        category: tasks.category,
        totalHours: sql<number>`COALESCE(SUM(${timeEntries.hours}), 0)`,
      })
      .from(timeEntries)
      .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .groupBy(tasks.category);
  }

  const { start, end } = getBounds(period);
  const startDate = start.split("T")[0];
  const endDate = end.split("T")[0];

  const entries = await db
    .select({
      category: tasks.category,
      totalHours: sql<number>`COALESCE(SUM(${timeEntries.hours}), 0)`,
    })
    .from(timeEntries)
    .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
    .where(and(gte(timeEntries.date, startDate), lte(timeEntries.date, endDate)))
    .groupBy(tasks.category);

  return entries;
}

export async function getTopTasksByLeverage(limit = 3) {
  // 1. Tasks explicitly marked "today" get top priority
  const todayTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        ne(tasks.status, "done"),
        isNull(tasks.dismissedFromFocus),
        eq(tasks.toComplete, "today")
      )
    )
    .orderBy(asc(tasks.sortOrder), desc(tasks.leverageScore), desc(tasks.priorityScore))
    .limit(limit);

  if (todayTasks.length >= limit) return todayTasks.slice(0, limit);

  // 2. Fill remaining slots with highest leverage tasks (excluding already-picked)
  const todayIds = todayTasks.map((t) => t.id);
  const remaining = limit - todayTasks.length;
  const leverageFill = await db
    .select()
    .from(tasks)
    .where(
      and(
        ne(tasks.status, "done"),
        isNull(tasks.dismissedFromFocus),
        ...(todayIds.length > 0 ? [sql`${tasks.id} NOT IN (${sql.join(todayIds.map(id => sql`${id}`), sql`, `)})`] : [])
      )
    )
    .orderBy(asc(tasks.sortOrder), desc(tasks.leverageScore), desc(tasks.priorityScore))
    .limit(remaining);

  return [...todayTasks, ...leverageFill];
}

export async function getOverdueTasks() {
  const today = new Date().toISOString().split("T")[0];
  return db
    .select()
    .from(tasks)
    .where(and(ne(tasks.status, "done"), lt(tasks.deadline, today)));
}

export async function getThisWeekTasks() {
  const { start, end } = getWeekBounds(0);
  const startDate = start.split("T")[0];
  const endDate = end.split("T")[0];

  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        ne(tasks.status, "done"),
        isNull(tasks.dismissedFromFocus),
        or(
          // Tasks with deadlines this week
          and(lte(tasks.deadline, endDate), gte(tasks.deadline, startDate)),
          // Tasks the user marked for this week or sooner
          inArray(tasks.toComplete, ["today", "this_week"])
        )
      )
    )
    .orderBy(asc(tasks.sortOrder), desc(tasks.leverageScore));

  // Deduplicate recurring tasks — keep the one with the latest deadline
  const seen = new Map<number, typeof rows[number]>();
  const result: typeof rows = [];
  for (const task of rows) {
    if (task.recurringTaskId) {
      const existing = seen.get(task.recurringTaskId);
      if (existing) {
        // Keep the one with the later deadline
        if (task.deadline && (!existing.deadline || task.deadline > existing.deadline)) {
          result[result.indexOf(existing)] = task;
          seen.set(task.recurringTaskId, task);
        }
        continue;
      }
      seen.set(task.recurringTaskId, task);
    }
    result.push(task);
  }
  return result;
}
