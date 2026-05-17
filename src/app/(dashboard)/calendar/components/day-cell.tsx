"use client";

import { eventColorValue } from "@/lib/constants";
import type { DayCell as DayCellModel } from "@/lib/calendar/year-grid";

function todayISO(): string {
  const d = new Date();
  const y = String(d.getFullYear()).padStart(4, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TODAY_ISO = todayISO();
const TODAY_RING_COLOR = "oklch(0.85 0.25 145)"; // neon green
const DATE_COL_BG = "oklch(0.94 0.05 70)"; // light orange tint for date columns
const DATE_COL_BORDER = "oklch(0.85 0.06 70)";

interface DayCellProps {
  cell: DayCellModel;
  height: number;
  onClick: (date: string) => void;
  onEventClick: (eventId: number) => void;
}

export function DayCell({ cell, height, onClick, onEventClick }: DayCellProps) {
  if (cell.isPlaceholder) {
    return (
      <div
        className="border-b border-border bg-muted/30"
        style={{ height }}
        aria-hidden="true"
      />
    );
  }

  const isCovered = !!cell.coveredByBlockId;
  const inline = cell.inlineBlock;
  const tint = inline
    ? inline.resolvedColor ?? (inline.color ? eventColorValue(inline.color) : null)
    : null;
  const isToday = cell.date === TODAY_ISO;

  // Single-day events fire the edit handler when clicked; the rest of the cell
  // (or empty cells) opens the create dialog pre-filled with this date.
  function handleClick() {
    if (inline) onEventClick(inline.eventId);
    else onClick(cell.date);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative grid w-full items-stretch border-b border-border text-left text-[10px] hover:bg-accent/40"
      style={{
        minHeight: height,
        gridTemplateColumns: "22px 30px 1fr",
        background: tint ?? undefined,
      }}
    >
      {isToday && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[2px]"
          style={{
            boxShadow: `inset 0 0 0 2px ${TODAY_RING_COLOR}`,
          }}
        />
      )}
      <span
        className="px-0.5 py-0 font-medium text-foreground tabular-nums sm:px-1 sm:py-0.5"
        style={{
          background: DATE_COL_BG,
          borderRight: `1px solid ${DATE_COL_BORDER}`,
        }}
      >
        {cell.dayOfMonth}
      </span>
      <span
        className="px-0.5 py-0 font-medium text-foreground sm:px-1 sm:py-0.5"
        style={{
          background: DATE_COL_BG,
          borderRight: `1px solid ${DATE_COL_BORDER}`,
        }}
      >
        {cell.weekday}
      </span>
      <span className="px-0.5 py-0 leading-tight whitespace-pre-wrap break-words text-foreground/90 sm:px-1 sm:py-0.5">
        {isCovered ? "" : inline?.title ?? ""}
      </span>
    </button>
  );
}
