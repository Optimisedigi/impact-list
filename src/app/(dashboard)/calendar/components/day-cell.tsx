"use client";

import { eventColorValue } from "@/lib/constants";
import type { DayCell as DayCellModel, EventBlock } from "@/lib/calendar/year-grid";

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

function blockColor(b: EventBlock): string {
  return b.resolvedColor ?? eventColorValue(b.color);
}

// The bullet sits on a pastel cell background, so very-light palette colors
// (the default "Calendar" gray, for example) vanish. Darken any OKLCH value
// by clamping its lightness so the dot is always readable against its row.
function bulletColor(value: string): string {
  const m = value.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/i);
  if (!m) return value;
  const l = Number.parseFloat(m[1]!);
  // If the color is already darkish, leave it alone; otherwise pull lightness
  // down to a fixed cap so it contrasts with the cell tint.
  const targetL = Math.min(l, 0.55);
  const c = m[2];
  const h = m[3];
  return `oklch(${targetL} ${c} ${h})`;
}

interface DayCellProps {
  cell: DayCellModel;
  height: number;
  // Tint to use when a cell holds multiple events (no single "winning" color).
  defaultProfileColor?: string | null;
  onClick: (date: string) => void;
  onEventClick: (eventId: number) => void;
}

export function DayCell({
  cell,
  height,
  defaultProfileColor,
  onClick,
  onEventClick,
}: DayCellProps) {
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
  const blocks = cell.inlineBlocks;
  const isToday = cell.date === TODAY_ISO;

  // Cell tint:
  //  - 1 event:   paint with its profile color (faithful to before).
  //  - 2+ events: paint with the default profile color so the cell still
  //    reads as "there's stuff here"; bullets per row identify each event.
  //  - 0 events:  no tint.
  const singleBlock = blocks.length === 1 ? blocks[0]! : null;
  const tint = singleBlock
    ? blockColor(singleBlock)
    : blocks.length > 1
      ? defaultProfileColor ?? null
      : null;

  // The button click goes to "create" by default; tapping a specific event
  // line opens that event. We only treat the whole cell as "open the one
  // event" when it has a single block, to match the previous behaviour.
  function handleCellClick() {
    if (singleBlock) onEventClick(singleBlock.eventId);
    else onClick(cell.date);
  }

  return (
    <button
      type="button"
      onClick={handleCellClick}
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
        className="flex items-center justify-center px-0.5 py-0 font-medium text-foreground tabular-nums sm:px-1 sm:py-0.5"
        style={{
          background: DATE_COL_BG,
          borderRight: `1px solid ${DATE_COL_BORDER}`,
        }}
      >
        {cell.dayOfMonth}
      </span>
      <span
        className="flex items-center justify-center px-0.5 py-0 font-medium text-foreground sm:px-1 sm:py-0.5"
        style={{
          background: DATE_COL_BG,
          borderRight: `1px solid ${DATE_COL_BORDER}`,
        }}
      >
        {cell.weekday}
      </span>
      {/* Title slot */}
      {isCovered ? (
        <span aria-hidden="true" />
      ) : singleBlock ? (
        <span className="flex items-center justify-center px-0.5 py-0 text-center leading-tight whitespace-pre-wrap break-words text-foreground/90 sm:px-1 sm:py-0.5">
          {singleBlock.title}
        </span>
      ) : blocks.length > 1 ? (
        <span className="flex flex-col items-stretch justify-center gap-px px-0.5 py-0.5 sm:px-1">
          {blocks.map((b) => (
            <span
              key={b.blockId}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(b.eventId);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onEventClick(b.eventId);
                }
              }}
              className="flex min-w-0 items-start gap-1 rounded-sm px-0.5 leading-tight text-foreground/90 hover:bg-accent/60"
              title={b.title}
            >
              <span
                className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: bulletColor(blockColor(b)) }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                {b.title}
              </span>
            </span>
          ))}
        </span>
      ) : (
        <span aria-hidden="true" />
      )}
    </button>
  );
}
