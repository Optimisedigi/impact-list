"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MonthColumn as MonthColumnModel } from "@/lib/calendar/year-grid";
import { eventColorValue } from "@/lib/constants";
import { DayCell } from "./day-cell";
import { EventBlock } from "./event-block";

interface MonthColumnProps {
  year: number;
  month: MonthColumnModel;
  dayRowHeight: number;
  defaultProfileColor?: string | null;
  registerRef?: (el: HTMLDivElement | null) => void;
  onCellClick: (date: string) => void;
  onBlockClick: (eventId: number) => void;
}

export function MonthColumn({
  month,
  dayRowHeight,
  defaultProfileColor,
  registerRef,
  onCellClick,
  onBlockClick,
}: MonthColumnProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Resolved color per block, keyed by blockId so each DayCell can look up
  // "what color is the multi-day block covering me?" without us threading the
  // entire block list through.
  const blockColorById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of month.blocks) {
      m.set(b.blockId, b.resolvedColor ?? eventColorValue(b.color));
    }
    return m;
  }, [month.blocks]);
  // Per-row [top, height] measured from the DOM. Multi-day overlays are
  // positioned/sized using these so wrapping cells push later rows down.
  const [rowMetrics, setRowMetrics] = useState<{ top: number; height: number }[]>([]);

  // Use useLayoutEffect for the initial pass so overlays render aligned on
  // the very first paint after any size change.
  useLayoutEffect(() => {
    function measure() {
      const m: { top: number; height: number }[] = [];
      for (let i = 0; i < month.days.length; i++) {
        const el = rowRefs.current[i];
        if (!el) {
          m.push({ top: i * dayRowHeight, height: dayRowHeight });
        } else {
          m.push({ top: el.offsetTop, height: el.offsetHeight });
        }
      }
      setRowMetrics(m);
    }
    measure();

    const ro = new ResizeObserver(measure);
    for (const el of rowRefs.current) {
      if (el) ro.observe(el);
    }
    return () => ro.disconnect();
  }, [month.days.length, dayRowHeight]);

  // Re-measure on window resize (column width can change, causing re-wrap).
  useEffect(() => {
    function onResize() {
      const m: { top: number; height: number }[] = [];
      for (let i = 0; i < month.days.length; i++) {
        const el = rowRefs.current[i];
        if (!el) continue;
        m.push({ top: el.offsetTop, height: el.offsetHeight });
      }
      if (m.length === month.days.length) setRowMetrics(m);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [month.days.length]);

  function setRootRef(el: HTMLDivElement | null) {
    rootRef.current = el;
    if (registerRef) registerRef(el);
  }

  return (
    <div
      ref={setRootRef}
      className="relative overflow-hidden border-r border-border"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Multi-day overlays painted FIRST (below the day cells) so single-day
          events sitting inside a multi-day span can punch through visually. */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {month.blocks.map((block) => {
          const startMetric = rowMetrics[block.startDayIndex];
          const endIdx = block.startDayIndex + block.rowSpan - 1;
          const endMetric = rowMetrics[endIdx];
          if (!startMetric || !endMetric) return null;
          const top = startMetric.top;
          const height = endMetric.top + endMetric.height - startMetric.top;
          return (
            <EventBlock
              key={block.blockId}
              block={block}
              top={top}
              height={height}
              onClick={onBlockClick}
            />
          );
        })}
      </div>

      {/* Day rows on top of the overlay layer. Most cells stay transparent so
          the overlay shows through; cells with inline events render a lighter
          backdrop in their title slot so the small event sits on top of a
          tinted (lightened) version of the big block. */}
      <div className="relative z-10">
        {month.days.map((cell, i) => (
          <div
            key={`${month.monthIndex}-${i}`}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
          >
            <DayCell
              cell={cell}
              height={dayRowHeight}
              defaultProfileColor={defaultProfileColor}
              coveringColor={
                cell.coveredByBlockId
                  ? blockColorById.get(cell.coveredByBlockId) ?? null
                  : null
              }
              onClick={onCellClick}
              onEventClick={onBlockClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
