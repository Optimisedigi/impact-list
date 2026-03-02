import { db } from "@/db";
import { tasks, timeEntries } from "@/db/schema";
import { eq, and, gte, lte, ne, desc, lt, sql } from "drizzle-orm";
import { getWeekBounds, getMonthBounds } from "@/lib/time-utils";

export type PeriodKey = "this_week" | "last_week" | "this_month" | "last_month";

function getBounds(period: PeriodKey) {
  switch (period) {
    case "this_week": return getWeekBounds(0);
    case "last_week": return getWeekBounds(-1);
    case "this_month": return getMonthBounds(0);
    case "last_month": return getMonthBounds(-1);
  }
}

export async function getTimeAllocationByPeriod(period: PeriodKey) {
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
  return db
    .select()
    .from(tasks)
    .where(ne(tasks.status, "done"))
    .orderBy(desc(tasks.leverageScore), desc(tasks.priorityScore))
    .limit(limit);
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

  return db
    .select()
    .from(tasks)
    .where(
      and(
        ne(tasks.status, "done"),
        lte(tasks.deadline, endDate),
        gte(tasks.deadline, startDate)
      )
    )
    .orderBy(desc(tasks.leverageScore));
}
