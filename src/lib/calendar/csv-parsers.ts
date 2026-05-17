import Papa from "papaparse";
import { EVENT_COLORS } from "@/lib/constants";

export type ImportFormat = "sheet" | "flat";

export interface ImportPreviewEvent {
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  color?: string | null;
  description?: string | null;
  location?: string | null;
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function isoDate(year: number, monthIndex0: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(monthIndex0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function exclusiveEnd(lastInclusive: string): string {
  // Date math without UTC drift: parse YYYY-MM-DD locally, add a day,
  // then re-serialize via local components.
  const [y, m, d] = lastInclusive.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d + 1);
  const yy = String(dt.getFullYear()).padStart(4, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function detectFormat(headerRow: string[]): ImportFormat {
  const lowered = headerRow.map((h) => (h ?? "").toString().trim().toLowerCase());
  const monthHits = lowered.filter((h) => MONTH_NAMES.includes(h)).length;
  if (monthHits >= 3) return "sheet";
  return "flat";
}

// Sheet layout parser — month columns side-by-side, day rows 1..31.
export function parseSheetCsv(csvText: string, year: number): ImportPreviewEvent[] {
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: false });
  const rows = parsed.data;
  if (rows.length === 0) return [];
  const header = rows[0]!;

  const monthCols: { monthIndex: number; col: number }[] = [];
  header.forEach((cell, idx) => {
    const m = MONTH_NAMES.indexOf((cell ?? "").toString().trim().toLowerCase());
    if (m >= 0) monthCols.push({ monthIndex: m, col: idx });
  });
  if (monthCols.length === 0) return [];

  // For each month, pick the column with the most event-like text content
  // among [headerCol, headerCol+1, headerCol+2] (covers day-num | weekday | text).
  // Candidates are clamped so we never spill into another month's columns.
  function pickEventCol(startCol: number, nextStartCol: number): number {
    const upper = Math.min(startCol + 2, nextStartCol - 1, (header.length ?? 1) - 1);
    const candidates: number[] = [];
    for (let c = startCol; c <= upper; c++) candidates.push(c);
    let best = startCol;
    let bestScore = -1;
    for (const c of candidates) {
      let score = 0;
      for (let r = 1; r < rows.length && r <= 31; r++) {
        const v = (rows[r]?.[c] ?? "").toString().trim();
        if (v.length > 2 && !/^\d+$/.test(v)) score += v.length;
      }
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }

  const events: ImportPreviewEvent[] = [];

  for (let i = 0; i < monthCols.length; i++) {
    const { monthIndex, col } = monthCols[i]!;
    const nextCol = monthCols[i + 1]?.col ?? (header.length ?? col + 3) + 1;
    const eventCol = pickEventCol(col, nextCol);
    let runStart: number | null = null;
    let runText: string | null = null;

    const daysInThisMonth = new Date(year, monthIndex + 1, 0).getDate();

    const flush = (endDay: number) => {
      if (runStart !== null && runText) {
        const start = isoDate(year, monthIndex, runStart);
        const end = exclusiveEnd(isoDate(year, monthIndex, endDay));
        events.push({
          title: runText,
          startsAt: start,
          endsAt: end,
          allDay: true,
          color: EVENT_COLORS[events.length % EVENT_COLORS.length]!.key,
        });
      }
      runStart = null;
      runText = null;
    };

    for (let day = 1; day <= 31; day++) {
      const rowIdx = day;
      const cell = (rows[rowIdx]?.[eventCol] ?? "").toString().trim();

      if (day > daysInThisMonth || cell === "") {
        flush(day - 1);
        continue;
      }
      if (runText === cell) continue;
      flush(day - 1);
      runStart = day;
      runText = cell;
    }
    flush(31);
  }

  return events;
}

// Flat events CSV.
export function parseFlatCsv(csvText: string): ImportPreviewEvent[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const events: ImportPreviewEvent[] = [];
  for (const row of parsed.data) {
    const title = (row.title ?? row.task ?? row.name ?? "").trim();
    const start = (
      row.date ?? row.start ?? row.start_date ?? row.starts_at ?? ""
    ).trim();
    if (!title || !start) continue;
    const endRaw = (row.end_date ?? row.end ?? row.ends_at ?? "").trim();
    const allDayRaw = (row.all_day ?? row.allday ?? "").trim().toLowerCase();
    const allDay =
      allDayRaw === ""
        ? !start.includes("T")
        : ["true", "1", "yes", "y"].includes(allDayRaw);

    let startsAt: string;
    let endsAt: string;
    if (allDay) {
      startsAt = start.slice(0, 10);
      const lastInclusive = endRaw ? endRaw.slice(0, 10) : startsAt;
      endsAt = exclusiveEnd(lastInclusive);
    } else {
      startsAt = start;
      endsAt = endRaw || start;
    }

    events.push({
      title,
      startsAt,
      endsAt,
      allDay,
      color: (row.color ?? "").trim() || null,
      description: (row.description ?? "").trim() || null,
      location: (row.location ?? "").trim() || null,
    });
  }
  return events;
}

export function parseImportCsv(csvText: string, year: number): {
  format: ImportFormat;
  events: ImportPreviewEvent[];
} {
  const headerParse = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  const headerRow = headerParse.data[0] ?? [];
  const format = detectFormat(headerRow);
  const events =
    format === "sheet" ? parseSheetCsv(csvText, year) : parseFlatCsv(csvText);
  return { format, events };
}
