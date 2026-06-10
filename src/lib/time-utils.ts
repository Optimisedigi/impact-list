import { addDays, addWeeks, differenceInCalendarDays, format, isAfter, max, startOfWeek } from "date-fns";

export function daysLeft(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const target = new Date(deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getWeekBounds(offset = 0): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday.toISOString(), end: sunday.toISOString() };
}

export function getMonthBounds(offset = 0): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export interface TimelineRange {
  start: string | Date;
  end?: string | Date | null;
}

export interface TimelineWindowOptions {
  now?: Date;
  weeksBefore?: number;
  minWeeks?: number;
  maxWeeks?: number;
}

export interface TimelineWindow {
  startWeek: Date;
  weeks: Date[];
}

const weekStartsOn = 1 as const;

function parseTimelineDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  const parsed = date instanceof Date ? date : new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveTimelineEnd(start: string | Date, end?: string | Date | null): Date {
  const startDate = parseTimelineDate(start);
  if (!startDate) {
    throw new Error("Timeline start date is invalid");
  }
  const endDate = parseTimelineDate(end);
  return endDate && isAfter(endDate, startDate) ? endDate : addWeeks(startDate, 1);
}

export function getTimelineWindow(
  ranges: TimelineRange[],
  options: TimelineWindowOptions = {}
): TimelineWindow {
  const now = options.now ?? new Date();
  const weeksBefore = options.weeksBefore ?? 4;
  const minWeeks = options.minWeeks ?? 13;
  const maxWeeks = options.maxWeeks ?? 26;
  const startWeek = startOfWeek(addWeeks(now, -weeksBefore), { weekStartsOn });
  const minEnd = addWeeks(startWeek, minWeeks);
  const maxEnd = addWeeks(startWeek, maxWeeks);
  const candidateEnds = ranges
    .map((range) => {
      const start = parseTimelineDate(range.start);
      return start ? resolveTimelineEnd(start, range.end) : null;
    })
    .filter((date): date is Date => date !== null);
  const desiredEnd = max([minEnd, now, ...candidateEnds]);
  const clampedEnd = isAfter(desiredEnd, maxEnd) ? maxEnd : desiredEnd;
  const weekCount = Math.max(minWeeks, Math.min(maxWeeks, Math.ceil(differenceInCalendarDays(clampedEnd, startWeek) / 7)));
  const weeks = Array.from({ length: weekCount }, (_, index) => addWeeks(startWeek, index));
  return { startWeek, weeks };
}

export function weekIndexFor(date: string | Date, startWeek: Date): number {
  const parsed = parseTimelineDate(date);
  if (!parsed) return 0;
  return differenceInCalendarDays(parsed, startWeek) / 7;
}

export function barGeometry(
  start: string | Date,
  end: string | Date | null | undefined,
  startWeek: Date,
  totalWeeks: number
): { leftPct: number; widthPct: number } {
  if (totalWeeks <= 0) return { leftPct: 0, widthPct: 0 };
  const startDate = parseTimelineDate(start);
  if (!startDate) return { leftPct: 0, widthPct: 0 };
  const endDate = resolveTimelineEnd(startDate, end);
  const rawStart = weekIndexFor(startDate, startWeek);
  const rawEnd = Math.max(rawStart, weekIndexFor(addDays(endDate, 1), startWeek));
  const clampedStart = Math.min(Math.max(rawStart, 0), totalWeeks);
  const clampedEnd = Math.min(Math.max(rawEnd, 0), totalWeeks);
  const widthWeeks = Math.max(0, clampedEnd - clampedStart);
  return {
    leftPct: (clampedStart / totalWeeks) * 100,
    widthPct: (widthWeeks / totalWeeks) * 100,
  };
}

export function formatTimelineWeekLabel(date: Date): string {
  return format(date, "d MMM");
}

/**
 * Returns today's date as YYYY-MM-DD in the caller's local timezone.
 * Using `new Date().toISOString().split("T")[0]` would return the UTC
 * date, which can be off-by-one for users near UTC boundaries.
 */
export function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
