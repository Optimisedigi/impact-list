"use client";

import { eventColorValue } from "@/lib/constants";
import type { EventBlock as EventBlockModel } from "@/lib/calendar/year-grid";

interface EventBlockProps {
  block: EventBlockModel;
  top: number;
  height: number;
  onClick: (eventId: number) => void;
}

export function EventBlock({ block, top, height, onClick }: EventBlockProps) {
  const bg = block.resolvedColor ?? eventColorValue(block.color);
  return (
    <button
      type="button"
      onClick={() => onClick(block.eventId)}
      className="pointer-events-auto absolute flex items-center justify-center overflow-hidden border-b border-l-2 border-border px-1 py-0.5 text-center text-[10px] font-medium text-[oklch(0.25_0_0)] hover:brightness-95"
      style={{
        top,
        height,
        // Offset over the day-number + weekday columns so the block sits in
        // the title slot. `right: 0` (with no `w-full`) keeps it inside the
        // month column so it never bleeds into the next month.
        left: 52,
        right: 0,
        background: bg,
        borderLeftColor: bg,
      }}
      title={block.title}
    >
      <span className="leading-tight whitespace-pre-wrap break-words">
        {block.title}
      </span>
    </button>
  );
}
