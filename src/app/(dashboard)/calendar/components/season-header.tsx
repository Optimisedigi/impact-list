import type { MonthColumn } from "@/lib/calendar/year-grid";
import { SEASON_COLORS, SEASON_LABEL, seasonForMonth, type Season } from "@/lib/calendar/seasons";

interface SeasonHeaderProps {
  months: MonthColumn[];
}

// Renders a single row of season bands across the 12 month columns by
// grouping consecutive months with the same season.
export function SeasonHeader({ months }: SeasonHeaderProps) {
  const groups: { season: Season; start: number; span: number }[] = [];
  for (const m of months) {
    const season = seasonForMonth(m.monthIndex);
    const last = groups[groups.length - 1];
    if (last && last.season === season) {
      last.span += 1;
    } else {
      groups.push({ season, start: m.monthIndex, span: 1 });
    }
  }

  return (
    <>
      {groups.map((g) => (
        <div
          key={`${g.season}-${g.start}`}
          className="border-b border-r border-border px-1 py-px text-center text-[9px] font-semibold uppercase tracking-wide text-[oklch(0.25_0_0)] sm:px-2 sm:py-0.5 sm:text-[10px]"
          style={{
            gridColumn: `${g.start + 1} / span ${g.span}`,
            background: SEASON_COLORS[g.season],
            scrollSnapAlign: "start",
          }}
        >
          {SEASON_LABEL[g.season]}
        </div>
      ))}
      {/* Month name row — separate row beneath the season bands. */}
      {months.map((m) => (
        <div
          key={`name-${m.monthIndex}`}
          className="border-b border-r border-border px-1 py-px text-center text-[11px] font-semibold text-[oklch(0.25_0_0)] sm:px-2 sm:py-0.5 sm:text-xs"
          style={{
            gridColumn: `${m.monthIndex + 1} / span 1`,
            background: "oklch(0.88 0.07 70)",
            scrollSnapAlign: "start",
          }}
        >
          {m.monthName}
        </div>
      ))}
    </>
  );
}
