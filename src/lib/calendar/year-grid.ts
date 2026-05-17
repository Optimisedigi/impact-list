import type { CalendarEvent } from "@/types";

export type WeekdayShort = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

// Events fed into the grid may carry resolved profile info (preferred) or
// fall back to their own color. Resolution happens in the query layer.
export interface GridEventInput extends CalendarEvent {
  resolvedProfileId?: number | null;
  resolvedColorValue?: string;
}

export interface EventBlock {
  // Stable ID derived from event id + month index — multi-day events crossing
  // months are split into one block per month, so we suffix with month index.
  blockId: string;
  eventId: number;
  title: string;
  color: string | null;
  // Final color to render (profile color when available, else event color).
  resolvedColor: string | null;
  // Profile this event belongs to (for filtering on the grid).
  profileId: number | null;
  rowSpan: number;       // how many day-rows this block covers inside the month
  startDayIndex: number; // 0-based row inside the month (the day-of-month - 1)
  allDay: boolean;
  source: CalendarEvent["source"];
}

export interface DayCell {
  date: string;            // ISO date YYYY-MM-DD; empty when isPlaceholder
  monthIndex: number;      // 0-11
  dayOfMonth: number;      // 1-31
  weekday: WeekdayShort | "";
  isPlaceholder: boolean;  // true for non-existent days (Feb 30/31, Apr 31, …)
  // The single-day event whose title should render inline in this cell.
  // Multi-day blocks are positioned via the overlay (see `blocks` on MonthColumn).
  inlineBlock: EventBlock | null;
  // If covered by a multi-day overlay starting earlier in the month.
  coveredByBlockId: string | null;
}

export interface MonthColumn {
  monthIndex: number;        // 0-11
  monthName: string;         // "January", …
  days: DayCell[];           // exactly 31 entries (placeholders fill gaps)
  blocks: EventBlock[];      // multi-day blocks (rowSpan > 1) for overlay rendering
}

export interface YearGrid {
  year: number;
  months: MonthColumn[];     // exactly 12
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS: WeekdayShort[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(year: number, monthIndex0: number): number {
  // Day 0 of next month = last day of this month.
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function isoDate(year: number, monthIndex0: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(monthIndex0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekdayFor(year: number, monthIndex0: number, day: number): WeekdayShort {
  const idx = new Date(year, monthIndex0, day).getDay();
  return WEEKDAYS[idx]!;
}

// Parse the start/end of an event into [startDate, endDate] inclusive (date-only).
// Google all-day events use exclusive end; we normalize to inclusive.
// Datetime events are clamped to their date span (local-date interpretation).
function eventDateRange(ev: CalendarEvent): { start: Date; end: Date } {
  const start = parseToLocalDate(ev.startsAt);
  let end = parseToLocalDate(ev.endsAt);
  if (ev.allDay) {
    // Exclusive end → step back one day for inclusive range.
    end = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  }
  if (end.getTime() < start.getTime()) end = new Date(start.getTime());
  return { start, end };
}

function parseToLocalDate(iso: string): Date {
  // Accept either YYYY-MM-DD or full ISO datetime. Use the date portion in
  // local time to stay aligned with the user's wall-clock grid.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
    return new Date(y, m - 1, d);
  }
  const dt = new Date(iso);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

export function buildYearGrid(
  year: number,
  events: GridEventInput[],
): YearGrid {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  // 1. Build empty month columns with 31 cells each (placeholders fill gaps).
  const months: MonthColumn[] = [];
  for (let m = 0; m < 12; m++) {
    const dim = daysInMonth(year, m);
    const days: DayCell[] = [];
    for (let row = 0; row < 31; row++) {
      const day = row + 1;
      if (day > dim) {
        days.push({
          date: "",
          monthIndex: m,
          dayOfMonth: day,
          weekday: "",
          isPlaceholder: true,
          inlineBlock: null,
          coveredByBlockId: null,
        });
      } else {
        days.push({
          date: isoDate(year, m, day),
          monthIndex: m,
          dayOfMonth: day,
          weekday: weekdayFor(year, m, day),
          isPlaceholder: false,
          inlineBlock: null,
          coveredByBlockId: null,
        });
      }
    }
    months.push({
      monthIndex: m,
      monthName: MONTH_NAMES[m]!,
      days,
      blocks: [],
    });
  }

  // 2. Place events. Sort by start date for stable rendering.
  const sorted = [...events].sort((a, b) => {
    if (a.startsAt === b.startsAt) return a.id - b.id;
    return a.startsAt < b.startsAt ? -1 : 1;
  });

  for (const ev of sorted) {
    if (ev.deletedAt) continue;
    const { start, end } = eventDateRange(ev);
    // Skip events fully outside this year.
    if (end.getTime() < yearStart.getTime() || start.getTime() > yearEnd.getTime()) continue;
    const clampedStart = maxDate(start, yearStart);
    const clampedEnd = minDate(end, yearEnd);

    // Split by month boundary → one block per month touched.
    let cursor = startOfDay(clampedStart);
    while (cursor.getTime() <= clampedEnd.getTime()) {
      const m = cursor.getMonth();
      const monthEnd = new Date(cursor.getFullYear(), m, daysInMonth(year, m));
      const blockEnd = minDate(monthEnd, clampedEnd);
      const startDayIndex = cursor.getDate() - 1;
      const endDayIndex = blockEnd.getDate() - 1;
      const rowSpan = endDayIndex - startDayIndex + 1;

      const block: EventBlock = {
        blockId: `e${ev.id}-m${m}`,
        eventId: ev.id,
        title: ev.title,
        color: ev.color,
        resolvedColor: ev.resolvedColorValue ?? null,
        profileId: ev.resolvedProfileId ?? null,
        rowSpan,
        startDayIndex,
        allDay: ev.allDay,
        source: ev.source,
      };

      const month = months[m]!;
      if (rowSpan === 1) {
        const cell = month.days[startDayIndex]!;
        // Prefer to keep the earliest inline block; later events stack underneath.
        // For simplicity: if multiple single-day events land on the same cell,
        // keep the first (sorted by start/id) inline and ignore overflow in v1.
        if (!cell.inlineBlock) cell.inlineBlock = block;
      } else {
        month.blocks.push(block);
        // Mark covered cells.
        for (let i = startDayIndex; i <= endDayIndex; i++) {
          month.days[i]!.coveredByBlockId = block.blockId;
        }
      }

      // Advance cursor to the first day of next month.
      cursor = new Date(cursor.getFullYear(), m + 1, 1);
    }
  }

  return { year, months };
}
