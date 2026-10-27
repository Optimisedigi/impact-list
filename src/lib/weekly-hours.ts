/** Pure helpers for weekly hours charts and averages (safe for client components). */

/** Average of bucket totals, counting only buckets that have logged hours. */
export function averageOfTotals(totals: number[]): number {
  const active = totals.filter((t) => t > 0);
  if (active.length === 0) return 0;
  return active.reduce((acc, t) => acc + t, 0) / active.length;
}

export interface WeekWindow<T> {
  weeks: T[];
  /** Weeks back from the latest window, clamped to the available range. */
  offset: number;
  /** Largest offset that still yields a full window. */
  maxOffset: number;
}

/**
 * A fixed-size window over chronologically ordered weeks. Offset 0 is the most
 * recent `size` weeks; each step of 1 moves the window one week earlier.
 */
export function sliceWeekWindow<T>(weeks: T[], size: number, offset: number): WeekWindow<T> {
  const maxOffset = Math.max(0, weeks.length - size);
  const clamped = Math.min(Math.max(0, Math.floor(offset)), maxOffset);
  const end = weeks.length - clamped;
  return { weeks: weeks.slice(Math.max(0, end - size), end), offset: clamped, maxOffset };
}

/**
 * Average weekly hours for a set of weeks, matching the analytics rule: the
 * in-progress current week and weeks with no logged hours are left out.
 */
export function averageCompletedWeekHours(weeks: { total: number; isCurrentWeek: boolean }[]): number {
  return averageOfTotals(weeks.filter((w) => !w.isCurrentWeek).map((w) => w.total));
}

function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** "Sep 28 to Oct 25, 2026" for weeks commencing on the first and last Mondays. */
export function formatWeekRange(firstWeekCommencing: string, lastWeekCommencing: string): string {
  const start = parseLocalDate(firstWeekCommencing);
  const end = parseLocalDate(lastWeekCommencing);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(start.getFullYear() !== end.getFullYear() ? { year: "numeric" } : {}),
  });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} to ${endLabel}`;
}
