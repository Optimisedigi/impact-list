"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MonthColumn as MonthColumnModel } from "@/lib/calendar/year-grid";
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
      {/* Day rows */}
      <div>
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
              onClick={onCellClick}
              onEventClick={onBlockClick}
            />
          </div>
        ))}
      </div>

      {/* Multi-day overlays positioned via measured row metrics so they line
          up with whatever real heights the day-rows ended up at. */}
      <div className="pointer-events-none absolute inset-0">
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
    </div>
  );
}
