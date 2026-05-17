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
import { MobileBannerPortal } from "./mobile-banner-portal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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

export function YearGrid({
  grid,
  resolvedColors,
  targets,
  profiles,
}: YearGridProps) {
  const [dialog, setDialog] = useState<EventDialogState>({ open: false });
  const [hiddenIds, toggleProfile] = useHiddenProfiles(profiles);
  const defaultProfileColor =
    profiles.find((p) => p.isDefault)?.colorValue ?? null;

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

  // Filter the grid based on hidden profile + subscription chips. Removing a
  // block also releases the day cells it covered so they read as empty rather
  // than showing a stale "covered" overlay placeholder.
  const filteredGrid = useMemo<YearGridModel>(() => {
    if (hiddenIds.size === 0) return grid;
    const blockHidden = (b: { profileId: number | null }) =>
      b.profileId !== null && hiddenIds.has(b.profileId);
    return {
      ...grid,
      months: grid.months.map((m) => {
        const removedBlockIds = new Set<string>();
        const blocks = m.blocks.filter((b) => {
          const hide = blockHidden(b);
          if (hide) removedBlockIds.add(b.blockId);
          return !hide;
        });
        const days = m.days.map((d) => {
          const next = { ...d };
          next.inlineBlocks = next.inlineBlocks.filter(
            (b) => !blockHidden(b),
          );
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
              defaultProfileColor={defaultProfileColor}
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

      {/* Desktop: profile filter chips pinned to the bottom of the calendar. */}
      <div className="hidden md:block">
        <ProfileFilter
          profiles={profiles}
          hiddenIds={hiddenIds}
          onToggle={toggleProfile}
        />
      </div>

      {/* Mobile: chips rendered into the shell's mobile header slot, to the
          right of the "Impact List" title. The portal strips the inner
          filter's border/padding so chips line up with the header height,
          and a larger touch size makes them easy to tap. */}
      <MobileBannerPortal>
        {/* Two font sizes smaller than desktop (text-xs → text-[10px]) and
            chips don't shrink, so when there are more than ~3 the row scrolls
            horizontally instead of squishing. */}
        <div className="flex max-w-full items-center gap-1 overflow-x-auto [&>div]:flex-nowrap [&>div]:border-0 [&>div]:bg-transparent [&>div]:px-0 [&>div]:py-0 [&_button]:h-6 [&_button]:shrink-0 [&_button]:px-2 [&_button]:text-[10px]">
          <ProfileFilter
            profiles={profiles}
            hiddenIds={hiddenIds}
            onToggle={toggleProfile}
          />
        </div>
      </MobileBannerPortal>

      <EventDialog
        state={dialog}
        resolvedColors={resolvedColors}
        targets={targets}
        profiles={profiles}
        onOpenChange={(open) => {
          if (!open) setDialog({ open: false });
        }}
        onAddAnotherForDate={(date) =>
          setDialog({ open: true, mode: "create", initialDate: date })
        }
      />

      {/* Floating "+" FAB — quick-add an event without picking a day first.
          The dialog defaults to today's date; the user can change it inside. */}
      <Button
        type="button"
        size="icon"
        onClick={() => setDialog({ open: true, mode: "create" })}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        aria-label="Add event"
        title="Add event"
      >
        <Plus className="h-5 w-5" />
      </Button>
      {/* Background poller: silently triggers /api/calendar/sync every 5 min
          while this view is mounted, so remote-side changes show up without
          needing to open Settings. */}
      <AutoSync enabled={targets.length > 0} />
    </div>
  );
}
