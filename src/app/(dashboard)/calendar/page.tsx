import { getResolvedEventsForYear } from "@/server/queries/calendar-events";
import { getResolvedColors } from "@/server/queries/calendar-color-labels";
import { getCalendarTargets } from "@/server/queries/calendar-targets";
import { getProfiles } from "@/server/queries/calendar-profiles";
import { buildYearGrid } from "@/lib/calendar/year-grid";
import { YearGrid } from "./components/year-grid";

export const dynamic = "force-dynamic";

interface CalendarPageProps {
  searchParams: Promise<{ year?: string }>;
}

function parseYear(raw: string | undefined): number {
  const now = new Date().getFullYear();
  if (!raw) return now;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1900 || n > 2200) return now;
  return n;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const { year: rawYear } = await searchParams;
  const year = parseYear(rawYear);

  const [events, resolvedColors, targets, profiles] = await Promise.all([
    getResolvedEventsForYear(year),
    getResolvedColors(),
    getCalendarTargets(),
    getProfiles(),
  ]);
  const grid = buildYearGrid(year, events);

  return (
    // Full-bleed: cancel the dashboard shell's p-3 / md:p-6 padding so the
    // yellow year band sits flush against the top of the content area.
    <div className="-m-3 flex h-full flex-col md:-m-6">
      <div className="flex-1 overflow-hidden">
        <YearGrid
          grid={grid}
          resolvedColors={resolvedColors}
          targets={targets}
          profiles={profiles}
        />
      </div>
    </div>
  );
}
