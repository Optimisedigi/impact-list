import { db } from "@/db";
import { tasks, timeEntries } from "@/db/schema";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";

export async function getWeeklyAllocationTrend(weeks = 12) {
  const results = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) - i * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

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

    const weekLabel = `W${monday.toISOString().split("T")[0].slice(5)}`;
    const weekData: Record<string, unknown> = { week: weekLabel };
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
      date: sql<string>`date(${tasks.updatedAt})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(tasks)
    .where(and(eq(tasks.status, "done"), gte(tasks.updatedAt, start)))
    .groupBy(sql`date(${tasks.updatedAt})`);

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
    if (t.status === "done" && t.updatedAt) {
      const date = t.updatedAt.split("T")[0];
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

export async function getLeverageTrend(weeks = 12) {
  const results = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) - i * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

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
          gte(tasks.updatedAt, startDate),
          lte(tasks.updatedAt, endDate)
        )
      );

    const weekLabel = `W${monday.toISOString().split("T")[0].slice(5)}`;
    results.push({ week: weekLabel, avgLeverage: avg[0]?.avgLeverage ?? 0 });
  }
  return results;
}
