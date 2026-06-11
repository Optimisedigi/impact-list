import { db } from "@/db";
import { dailyTimeLogs } from "@/db/schema";
import { and, desc, gte, lte } from "drizzle-orm";
import type { DailyTimeLog } from "@/types";

/** Minimal shape needed by the pure aggregation helpers. */
export interface DailyLogRow {
  date: string;
  hours: number;
  category: string | null;
}

export interface WeekRange {
  monday: Date;
  sunday: Date;
  weekNum: number;
}

export interface DailyHoursStats {
  totalHours: number;
  loggedDays: number;
  avgPerLoggedDay: number;
  firstLogDate: string | null;
  lastLogDate: string | null;
}

export interface MonthHours {
  month: string;
  total: number;
}

export interface CategoryHours {
  category: string | null;
  total: number;
}

export const UNTAGGED_KEY = "__untagged__";

/** Monday of the week containing the given date (local). */
export function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday-based week ranges from a start date (or earliest log) up to now. */
export function getWeekRanges(startDate?: string | null, now: Date = new Date()): WeekRange[] {
  const currentMonday = getMondayOf(now);

  let firstMonday: Date;
  if (startDate) {
    firstMonday = getMondayOf(new Date(startDate + "T00:00:00"));
  } else {
    firstMonday = new Date(currentMonday);
    firstMonday.setDate(firstMonday.getDate() - 11 * 7);
  }

  const ranges: WeekRange[] = [];
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

/** All-time stats. Average is over distinct days that actually have logs. */
export function aggregateStats(logs: DailyLogRow[]): DailyHoursStats {
  let totalHours = 0;
  const days = new Set<string>();
  for (const log of logs) {
    totalHours += log.hours;
    days.add(log.date);
  }
  const loggedDays = days.size;
  const sortedDays = [...days].sort();
  return {
    totalHours,
    loggedDays,
    avgPerLoggedDay: loggedDays > 0 ? totalHours / loggedDays : 0,
    firstLogDate: sortedDays[0] ?? null,
    lastLogDate: sortedDays[sortedDays.length - 1] ?? null,
  };
}

/**
 * Bucket logs into Monday-based weeks. Each row carries `total` plus one key
 * per category (using UNTAGGED_KEY for null categories) so a chart can stack.
 */
export function aggregateByWeek(logs: DailyLogRow[], ranges: WeekRange[]): Record<string, unknown>[] {
  return ranges.map(({ monday, sunday, weekNum }) => {
    const startStr = toLocalISO(monday);
    const endStr = toLocalISO(sunday);
    const row: Record<string, unknown> = {
      week: `W${weekNum}`,
      weekCommencing: startStr,
      total: 0,
    };
    let total = 0;
    for (const log of logs) {
      if (log.date < startStr || log.date > endStr) continue;
      const key = log.category ?? UNTAGGED_KEY;
      row[key] = ((row[key] as number | undefined) ?? 0) + log.hours;
      total += log.hours;
    }
    row.total = Math.round(total * 100) / 100;
    return row;
  });
}

/** Totals grouped by calendar month (YYYY-MM), ascending. */
export function aggregateByMonth(logs: DailyLogRow[]): MonthHours[] {
  const byMonth = new Map<string, number>();
  for (const log of logs) {
    const month = log.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + log.hours);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));
}

/** Totals grouped by category (null category preserved as its own bucket). */
export function aggregateByCategory(logs: DailyLogRow[]): CategoryHours[] {
  const byCategory = new Map<string | null, number>();
  for (const log of logs) {
    byCategory.set(log.category, (byCategory.get(log.category) ?? 0) + log.hours);
  }
  return [...byCategory.entries()]
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}

async function getAllLogs(): Promise<DailyLogRow[]> {
  return db
    .select({ date: dailyTimeLogs.date, hours: dailyTimeLogs.hours, category: dailyTimeLogs.category })
    .from(dailyTimeLogs);
}

export async function getDailyLogsByDateRange(start: string, end: string): Promise<DailyTimeLog[]> {
  return db
    .select()
    .from(dailyTimeLogs)
    .where(and(gte(dailyTimeLogs.date, start), lte(dailyTimeLogs.date, end)))
    .orderBy(desc(dailyTimeLogs.date));
}

export async function getRecentDailyLogs(limit = 60): Promise<DailyTimeLog[]> {
  return db
    .select()
    .from(dailyTimeLogs)
    .orderBy(desc(dailyTimeLogs.date), desc(dailyTimeLogs.id))
    .limit(limit);
}

export async function getDailyHoursStats(): Promise<DailyHoursStats> {
  const logs = await getAllLogs();
  return aggregateStats(logs);
}

export async function getDailyHoursByWeek(businessStartDate?: string | null): Promise<Record<string, unknown>[]> {
  const logs = await getAllLogs();
  const stats = aggregateStats(logs);
  const startDate = businessStartDate ?? stats.firstLogDate;
  const ranges = getWeekRanges(startDate);
  return aggregateByWeek(logs, ranges);
}

export async function getDailyHoursByMonth(): Promise<MonthHours[]> {
  const logs = await getAllLogs();
  return aggregateByMonth(logs);
}

export async function getDailyHoursByCategory(start?: string, end?: string): Promise<CategoryHours[]> {
  const logs =
    start && end ? await getDailyLogsByDateRange(start, end) : await getAllLogs();
  return aggregateByCategory(logs);
}
