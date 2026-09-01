import { addWeeks, differenceInCalendarWeeks, startOfWeek } from "date-fns";

export interface LifeWeek {
  /** 0-based week index since date of birth. */
  index: number;
  /** Year of life this week falls in (0-based row). */
  year: number;
  /** ISO date of the Monday starting this week. */
  weekStart: string;
  status: "past" | "current" | "future";
}

export interface LifeWeeksGrid {
  weeksPerYear: number;
  totalWeeks: number;
  currentWeekIndex: number;
  weeks: LifeWeek[];
}

const WEEKS_PER_YEAR = 52;

/** Builds the full week grid from date of birth to expected life end, in the
 *  same chronological, one-row-per-year layout as a classic "life in weeks"
 *  calendar. Weeks are grouped 52 per row regardless of leap years — the
 *  same simplification the printed/spreadsheet versions use. */
export function buildLifeWeeksGrid(dateOfBirth: string, lifeExpectancyYears: number, today: Date = new Date()): LifeWeeksGrid {
  const dob = startOfWeek(new Date(dateOfBirth), { weekStartsOn: 1 });
  const totalWeeks = Math.max(0, Math.round(lifeExpectancyYears * WEEKS_PER_YEAR));
  const currentWeekIndex = Math.max(0, differenceInCalendarWeeks(today, dob, { weekStartsOn: 1 }));

  const weeks: LifeWeek[] = [];
  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = addWeeks(dob, i);
    weeks.push({
      index: i,
      year: Math.floor(i / WEEKS_PER_YEAR),
      weekStart: weekStart.toISOString().slice(0, 10),
      status: i < currentWeekIndex ? "past" : i === currentWeekIndex ? "current" : "future",
    });
  }

  return { weeksPerYear: WEEKS_PER_YEAR, totalWeeks, currentWeekIndex, weeks };
}
