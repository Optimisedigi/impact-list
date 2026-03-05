import { db } from "@/db";
import { tasks, timeEntries } from "@/db/schema";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";

/** Get the Monday of the week containing a given date */
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Calculate weeks from a business start date to now */
function getWeekRanges(businessStartDate?: string | null) {
  const now = new Date();
  const currentMonday = getMondayOf(now);

  let firstMonday: Date;
  if (businessStartDate) {
    firstMonday = getMondayOf(new Date(businessStartDate + "T00:00:00"));
  } else {
    // Fallback: 12 weeks back
    firstMonday = new Date(currentMonday);
    firstMonday.setDate(firstMonday.getDate() - 11 * 7);
  }

  const ranges: { monday: Date; sunday: Date; weekNum: number }[] = [];
  const m = new Date(firstMonday);
  let weekNum = 1;
  while (m <= currentMonday) {
    const monday = new Date(m);
    const sunday = new Date(m);
    sunday.setDate(monday.getDate() + 6);
    ranges.push({ monday, sunday, weekNum });
    m.setDate(m.getDate() + 7);
    weekNum++;
  }
  return ranges;
}

export async function getWeeklyAllocationTrend(weeks?: number, businessStartDate?: string | null) {
  const ranges = businessStartDate ? getWeekRanges(businessStartDate) : getWeekRanges();
  const sliced = weeks && !businessStartDate ? ranges.slice(-weeks) : ranges;
  const results = [];

  for (const { monday, sunday, weekNum } of sliced) {
    const startDate = monday.toISOString().split("T")[0];
    const endDate = sunday.toISOString().split("T")[0];

    const entries = await db
      .select({
        category: tasks.category,
        totalHours: sql<number>`COALESCE(SUM(${timeEntries.hours}), 0)`,
      })
      .from(timeEntries)
      .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .where(and(gte(timeEntries.date, startDate), lte(timeEntries.date, endDate)))
      .groupBy(tasks.category);

    const mondayStr = monday.toISOString().split("T")[0];
    const weekData: Record<string, unknown> = { week: `W${weekNum}`, weekCommencing: mondayStr };
    for (const entry of entries) {
      weekData[entry.category] = entry.totalHours;
    }
    results.push(weekData);
  }
  return results;
}

export async function getCompletionsByDay(days = 365) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const start = startDate.toISOString().split("T")[0];

  const completions = await db
    .select({
      date: sql<string>`date(COALESCE(${tasks.completedAt}, ${tasks.updatedAt}))`,
      count: sql<number>`COUNT(*)`,
    })
    .from(tasks)
    .where(and(eq(tasks.status, "done"), gte(sql`COALESCE(${tasks.completedAt}, ${tasks.updatedAt})`, start)))
    .groupBy(sql`date(COALESCE(${tasks.completedAt}, ${tasks.updatedAt}))`);

  return completions.map((c) => ({ date: c.date, count: c.count }));
}

export async function getPhaseBurndown(phaseId: number) {
  const phaseTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.growthPhaseId, phaseId));

  const total = phaseTasks.length;
  const doneByDate: Record<string, number> = {};

  for (const t of phaseTasks) {
    if (t.status === "done" && (t.completedAt || t.updatedAt)) {
      const date = (t.completedAt || t.updatedAt).split("T")[0];
      doneByDate[date] = (doneByDate[date] || 0) + 1;
    }
  }

  const dates = Object.keys(doneByDate).sort();
  let remaining = total;
  const burndown = [{ date: dates[0] ?? new Date().toISOString().split("T")[0], remaining: total }];

  for (const date of dates) {
    remaining -= doneByDate[date];
    burndown.push({ date, remaining });
  }

  return burndown;
}

export async function getCategoryPercentageOverTime(weeks?: number, businessStartDate?: string | null) {
  const ranges = businessStartDate ? getWeekRanges(businessStartDate) : getWeekRanges();
  const sliced = weeks && !businessStartDate ? ranges.slice(-weeks) : ranges;
  const results = [];

  for (const { monday, sunday, weekNum } of sliced) {
    const startDate = monday.toISOString().split("T")[0];
    const endDate = sunday.toISOString().split("T")[0];

    const entries = await db
      .select({
        category: tasks.category,
        totalHours: sql<number>`COALESCE(SUM(${timeEntries.hours}), 0)`,
      })
      .from(timeEntries)
      .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .where(and(gte(timeEntries.date, startDate), lte(timeEntries.date, endDate)))
      .groupBy(tasks.category);

    const totalHours = entries.reduce((s, e) => s + e.totalHours, 0);
    const mondayStr = monday.toISOString().split("T")[0];
    const weekData: Record<string, unknown> = {
      week: `W${weekNum}`,
      weekCommencing: mondayStr,
    };

    if (totalHours > 0) {
      for (const entry of entries) {
        weekData[entry.category] = Math.round((entry.totalHours / totalHours) * 100);
      }
    }
    results.push(weekData);
  }
  return results;
}

export async function getRecentlyCompletedTasks(limit = 50) {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      category: tasks.category,
      client: tasks.client,
      estimatedHours: tasks.estimatedHours,
      actualHours: tasks.actualHours,
      completedAt: tasks.completedAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.status, "done"))
    .orderBy(desc(sql`COALESCE(${tasks.completedAt}, ${tasks.updatedAt})`))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    completedDate: (r.completedAt || r.updatedAt).split("T")[0],
  }));
}

export async function getLeverageTrend(weeks?: number, businessStartDate?: string | null) {
  const ranges = businessStartDate ? getWeekRanges(businessStartDate) : getWeekRanges();
  const sliced = weeks && !businessStartDate ? ranges.slice(-weeks) : ranges;
  const results = [];

  for (const { monday, sunday, weekNum } of sliced) {
    const startDate = monday.toISOString();
    const endDate = sunday.toISOString();

    const avg = await db
      .select({
        avgLeverage: sql<number>`COALESCE(AVG(${tasks.leverageScore}), 0)`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.status, "done"),
          gte(sql`COALESCE(${tasks.completedAt}, ${tasks.updatedAt})`, startDate),
          lte(sql`COALESCE(${tasks.completedAt}, ${tasks.updatedAt})`, endDate)
        )
      );

    const mondayStr = monday.toISOString().split("T")[0];
    results.push({ week: `W${weekNum}`, weekCommencing: mondayStr, avgLeverage: avg[0]?.avgLeverage ?? 0 });
  }
  return results;
}
