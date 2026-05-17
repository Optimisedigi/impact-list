"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { YearGrid as YearGridModel } from "@/lib/calendar/year-grid";
import type { ResolvedColor } from "@/server/queries/calendar-color-labels";
import type { CalendarTarget } from "@/server/queries/calendar-targets";
import type { ProfileWithColor } from "@/server/queries/calendar-profiles";
import { MonthColumn } from "./month-column";
import { SeasonHeader } from "./season-header";
import { EventDialog, type EventDialogState } from "./event-dialog";
import { YearSwitcher } from "./year-switcher";
import { AutoSync } from "./auto-sync";
import { ProfileFilter, useHiddenProfiles } from "./profile-filter";

interface YearGridProps {
  grid: YearGridModel;
  resolvedColors: ResolvedColor[];
  targets: CalendarTarget[];
  profiles: ProfileWithColor[];
}

// Minimum height of one day-row. Rows grow when their cell content wraps;
// multi-day overlays measure real row positions to stay aligned. Smaller on
// mobile so all 31 days fit without scrolling.
const DAY_ROW_HEIGHT_DESKTOP = 18;
const DAY_ROW_HEIGHT_MOBILE = 15;
export const DAY_ROW_HEIGHT = DAY_ROW_HEIGHT_DESKTOP;

export function YearGrid({ grid, resolvedColors, targets, profiles }: YearGridProps) {
  const [dialog, setDialog] = useState<EventDialogState>({ open: false });
  const [hiddenIds, setHiddenIds] = useHiddenProfiles(profiles);
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dayRowHeight, setDayRowHeight] = useState(DAY_ROW_HEIGHT_DESKTOP);

  // Pick a row height based on viewport so all 31 day rows fit on mobile.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function update() {
      setDayRowHeight(
        window.innerWidth < 640 ? DAY_ROW_HEIGHT_MOBILE : DAY_ROW_HEIGHT_DESKTOP,
      );
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Filter the grid based on hidden profile chips. Removing a block also
  // releases the day cells it covered so they read as empty rather than
  // showing a stale "covered" overlay placeholder.
  const filteredGrid = useMemo<YearGridModel>(() => {
    if (hiddenIds.size === 0) return grid;
    return {
      ...grid,
      months: grid.months.map((m) => {
        const removedBlockIds = new Set<string>();
        const blocks = m.blocks.filter((b) => {
          const hide = b.profileId !== null && hiddenIds.has(b.profileId);
          if (hide) removedBlockIds.add(b.blockId);
          return !hide;
        });
        const days = m.days.map((d) => {
          const next = { ...d };
          if (next.inlineBlock) {
            const pid = next.inlineBlock.profileId;
            if (pid !== null && hiddenIds.has(pid)) next.inlineBlock = null;
          }
          if (
            next.coveredByBlockId &&
            removedBlockIds.has(next.coveredByBlockId)
          ) {
            next.coveredByBlockId = null;
          }
          return next;
        });
        return { ...m, blocks, days };
      }),
    };
  }, [grid, hiddenIds]);

  // When viewing the current year, scroll horizontally so today's month is
  // the leftmost visible column. Earlier months remain reachable by scrolling left.
  useEffect(() => {
    const today = new Date();
    if (today.getFullYear() !== grid.year) return;
    const target = monthRefs.current[today.getMonth()];
    const container = scrollRef.current;
    if (!target || !container) return;
    // Disable snap during programmatic scroll so it lands exactly on offsetLeft.
    const prevSnap = container.style.scrollSnapType;
    container.style.scrollSnapType = "none";
    container.scrollLeft = target.offsetLeft;
    requestAnimationFrame(() => {
      container.style.scrollSnapType = prevSnap || "x mandatory";
    });
  }, [grid.year]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Year band — yellow band doubles as the year switcher. */}
      <div className="h-6 border-b border-border bg-[oklch(0.93_0.12_95)] sm:h-7">
        <YearSwitcher year={grid.year} variant="band" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto">
        <div
          className="min-w-full"
          style={{
            // Desktop: 12 equal columns. Mobile: each column ~80vw with snap.
            display: "grid",
            gridTemplateColumns:
              "repeat(12, minmax(min(80vw, 140px), 1fr))",
            scrollSnapType: "x mandatory",
          }}
        >
          {/* Season header row — spans all 12 columns. */}
          <SeasonHeader months={filteredGrid.months} />

          {/* Month columns. */}
          {filteredGrid.months.map((m) => (
            <MonthColumn
              key={m.monthIndex}
              year={grid.year}
              month={m}
              dayRowHeight={dayRowHeight}
              registerRef={(el) => {
                monthRefs.current[m.monthIndex] = el;
              }}
              onCellClick={(date) =>
                setDialog({ open: true, mode: "create", initialDate: date })
              }
              onBlockClick={(eventId) =>
                setDialog({ open: true, mode: "edit", eventId })
              }
            />
          ))}
        </div>
      </div>

      {/* Profile filter chips at the bottom of the calendar. */}
      <ProfileFilter
        profiles={profiles}
        hiddenIds={hiddenIds}
        onChange={setHiddenIds}
      />

      <EventDialog
        state={dialog}
        resolvedColors={resolvedColors}
        targets={targets}
        profiles={profiles}
        onOpenChange={(open) => {
          if (!open) setDialog({ open: false });
        }}
      />
      {/* Background poller: silently triggers /api/calendar/sync every 5 min
          while this view is mounted, so remote-side changes show up without
          needing to open Settings. */}
      <AutoSync enabled={targets.length > 0} />
    </div>
  );
}
