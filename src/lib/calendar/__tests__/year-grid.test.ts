import { describe, expect, it } from "vitest";
import { buildYearGrid } from "../year-grid";
import type { CalendarEvent } from "@/types";

function ev(partial: Partial<CalendarEvent> & {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
}): CalendarEvent {
  return {
    id: partial.id,
    title: partial.title,
    description: null,
    location: null,
    startsAt: partial.startsAt,
    endsAt: partial.endsAt,
    allDay: partial.allDay ?? true,
    color: partial.color ?? null,
    source: partial.source ?? "local",
    externalId: null,
    externalCalendarId: null,
    externalEtag: null,
    externalUpdatedAt: null,
    profileId: null,
    deletedAt: partial.deletedAt ?? null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

describe("buildYearGrid", () => {
  it("produces 12 months × 31 days with placeholders for non-existent days", () => {
    const grid = buildYearGrid(2026, []);
    expect(grid.months).toHaveLength(12);
    for (const m of grid.months) {
      expect(m.days).toHaveLength(31);
    }
    // 2026 is not a leap year — Feb has 28 days; rows 29–31 are placeholders.
    expect(grid.months[1]!.days[28]!.isPlaceholder).toBe(true);
    expect(grid.months[1]!.days[30]!.isPlaceholder).toBe(true);
    // April has 30 days — row 31 is placeholder.
    expect(grid.months[3]!.days[30]!.isPlaceholder).toBe(true);
    expect(grid.months[3]!.days[29]!.isPlaceholder).toBe(false);
  });

  it("places a single-day event inline on its day cell", () => {
    const grid = buildYearGrid(2026, [
      ev({ id: 1, title: "Hello", startsAt: "2026-03-15", endsAt: "2026-03-16" }),
    ]);
    const march = grid.months[2]!;
    expect(march.days[14]!.inlineBlocks).toHaveLength(1);
    expect(march.days[14]!.inlineBlocks[0]!.title).toBe("Hello");
    expect(march.blocks).toHaveLength(0);
  });

  it("creates a multi-day block spanning multiple rows within a month", () => {
    const grid = buildYearGrid(2026, [
      ev({ id: 1, title: "New Zealand", startsAt: "2026-04-18", endsAt: "2026-04-27" }),
    ]);
    const april = grid.months[3]!;
    expect(april.blocks).toHaveLength(1);
    expect(april.blocks[0]!.rowSpan).toBe(9);
    expect(april.blocks[0]!.startDayIndex).toBe(17);
    // All covered cells should reference the block id.
    for (let i = 17; i <= 25; i++) {
      expect(april.days[i]!.coveredByBlockId).toBe(april.blocks[0]!.blockId);
    }
    expect(april.days[26]!.coveredByBlockId).toBeNull();
  });

  it("splits a cross-month event into one block per month", () => {
    const grid = buildYearGrid(2026, [
      ev({ id: 1, title: "Long", startsAt: "2026-03-28", endsAt: "2026-04-04" }),
    ]);
    const march = grid.months[2]!;
    const april = grid.months[3]!;
    expect(march.blocks).toHaveLength(1);
    expect(april.blocks).toHaveLength(1);
    // March block covers 28-31 → startDayIndex 27, span 4.
    expect(march.blocks[0]!.startDayIndex).toBe(27);
    expect(march.blocks[0]!.rowSpan).toBe(4);
    // April block covers 1-3 (endsAt is exclusive 04-04 → inclusive 04-03), startDayIndex 0, span 3.
    expect(april.blocks[0]!.startDayIndex).toBe(0);
    expect(april.blocks[0]!.rowSpan).toBe(3);
  });

  it("clamps events that extend beyond the year", () => {
    const grid = buildYearGrid(2026, [
      ev({ id: 1, title: "Wraps", startsAt: "2025-12-30", endsAt: "2026-01-03" }),
    ]);
    const jan = grid.months[0]!;
    expect(jan.blocks).toHaveLength(1);
    expect(jan.blocks[0]!.startDayIndex).toBe(0);
    // endsAt exclusive 01-03 → inclusive 01-02 → span 2.
    expect(jan.blocks[0]!.rowSpan).toBe(2);
  });

  it("stacks multiple single-day events on the same date", () => {
    const grid = buildYearGrid(2026, [
      ev({ id: 1, title: "Morning standup", startsAt: "2026-06-13", endsAt: "2026-06-14" }),
      ev({ id: 2, title: "Evening dinner", startsAt: "2026-06-13", endsAt: "2026-06-14" }),
    ]);
    const june = grid.months[5]!;
    expect(june.days[12]!.inlineBlocks).toHaveLength(2);
    expect(june.days[12]!.inlineBlocks.map((b) => b.title)).toEqual([
      "Morning standup",
      "Evening dinner",
    ]);
  });

  it("excludes soft-deleted events", () => {
    const grid = buildYearGrid(2026, [
      ev({
        id: 1,
        title: "Gone",
        startsAt: "2026-05-01",
        endsAt: "2026-05-02",
        deletedAt: "2026-04-30",
      }),
    ]);
    expect(grid.months[4]!.days[0]!.inlineBlocks).toHaveLength(0);
  });
});
