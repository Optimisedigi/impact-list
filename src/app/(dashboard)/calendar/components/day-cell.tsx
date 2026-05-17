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

// Lighten an OKLCH color so it can sit behind text on top of a darker block
// of the same hue — keeps the visual "these belong together" cue without
// drowning the inline event's title.
function lightenedColor(value: string): string {
  const m = value.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/i);
  if (!m) return value;
  const l = Number.parseFloat(m[1]!);
  const c = Number.parseFloat(m[2]!);
  const h = m[3];
  // Pull lightness up toward white and drop chroma so the result is a pale
  // tinted backdrop rather than a near-duplicate of the underlying block.
  const targetL = Math.max(l, 0.96);
  const targetC = Math.min(c, 0.04);
  return `oklch(${targetL} ${targetC} ${h})`;
}

interface DayCellProps {
  cell: DayCellModel;
  height: number;
  // Tint to use when a cell holds multiple events (no single "winning" color).
  defaultProfileColor?: string | null;
  // Color of the multi-day block currently covering this row, if any. Used
  // as the inline event's title backdrop in a lightened form so the small
  // event reads as "inside" the bigger one rather than punching through it.
  coveringColor?: string | null;
  onClick: (date: string) => void;
  onEventClick: (eventId: number) => void;
}

export function DayCell({
  cell,
  height,
  defaultProfileColor,
  coveringColor,
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

  // Cell tint (title column only; date columns keep their own orange tint):
  //  - covered by a multi-day block + has inline event(s): semi-transparent
  //    white backdrop so the overlay color shows through, lightened.
  //  - covered, no inline events: fully transparent so the overlay reads
  //    as a solid colored bar.
  //  - not covered, 1 event: paint with its profile color.
  //  - not covered, 2+ events: paint with the default profile color.
  //  - not covered, no events: no tint.
  const singleBlock = blocks.length === 1 ? blocks[0]! : null;
  // When all stacked events share the same profile, the cell background can
  // safely take that profile's color — there's no ambiguity to communicate
  // with the neutral default tint.
  const sharedProfileColor =
    blocks.length > 1 &&
    blocks.every(
      (b) =>
        b.profileId !== null && b.profileId === blocks[0]!.profileId,
    )
      ? blockColor(blocks[0]!)
      : null;
  let titleBg: string | undefined;
  if (isCovered) {
    // When an inline event lives inside a multi-day span, paint the title
    // slot with a lightened version of the covering block's color. That
    // hides the big block's text behind it (no "lines through text") while
    // keeping the visual hint that the small event is nested inside the
    // bigger one. Falls back to opaque white if we can't resolve a color.
    titleBg =
      blocks.length > 0
        ? coveringColor
          ? lightenedColor(coveringColor)
          : "oklch(1 0 0)"
        : undefined;
  } else if (singleBlock) {
    titleBg = blockColor(singleBlock);
  } else if (sharedProfileColor) {
    titleBg = sharedProfileColor;
  } else if (blocks.length > 1) {
    titleBg = defaultProfileColor ?? undefined;
  }

  // The button click goes to "create" by default; tapping a specific event
  // line opens that event. Covered cells with no inline events open the
  // covering block by routing to the cell's date so the user can at least
  // see it. Single-block cells open that block.
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
      }}
    >
      {isToday && (
        // z-30 keeps the ring above the title slot (z-20) so colored event
        // backdrops can't clip the right edge of the border.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 rounded-[2px] animate-today-ring"
          style={
            {
              "--today-ring": TODAY_RING_COLOR,
            } as React.CSSProperties
          }
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
      {/* Title slot. Stays above the multi-day overlay (z-20) so its text
          and backdrop sit on top of the colored bar underneath rather than
          competing with it. */}
      {blocks.length === 0 ? (
        <span
          aria-hidden="true"
          className="relative z-20"
          style={{ background: titleBg }}
        />
      ) : singleBlock ? (
        <span
          className="relative z-20 flex items-center justify-center px-0.5 py-0 text-center leading-tight whitespace-pre-wrap break-words text-foreground/90 sm:px-1 sm:py-0.5"
          style={{ background: titleBg }}
        >
          {singleBlock.title}
        </span>
      ) : (
        <span
          className="relative z-20 flex flex-col items-stretch justify-center gap-px px-0.5 py-0.5 sm:px-1"
          style={{ background: titleBg }}
        >
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
      )}
    </button>
  );
}
