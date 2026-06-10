import { describe, expect, it } from "vitest";
import { barGeometry, getTimelineWindow, weekIndexFor } from "../time-utils";

describe("timeline date helpers", () => {
  const now = new Date("2026-06-10T12:00:00");

  it("keeps four weeks of past context and at least the minimum window", () => {
    const window = getTimelineWindow([], { now, weeksBefore: 4, minWeeks: 13, maxWeeks: 26 });

    expect(window.startWeek.getFullYear()).toBe(2026);
    expect(window.startWeek.getMonth()).toBe(4);
    expect(window.startWeek.getDate()).toBe(11);
    expect(window.weeks).toHaveLength(13);
  });

  it("expands to include task ends while respecting the maximum window", () => {
    const window = getTimelineWindow(
      [{ start: "2026-06-15", end: "2026-10-10" }],
      { now, weeksBefore: 4, minWeeks: 13, maxWeeks: 26 }
    );

    expect(window.weeks.length).toBeGreaterThan(20);
    expect(window.weeks.length).toBeLessThanOrEqual(26);
  });

  it("returns fractional week indices from the window start", () => {
    const startWeek = new Date(2026, 4, 11);

    expect(weekIndexFor("2026-05-11", startWeek)).toBe(0);
    expect(weekIndexFor("2026-05-18", startWeek)).toBe(1);
    expect(weekIndexFor("2026-05-14", startWeek)).toBeCloseTo(3 / 7);
  });

  it("positions a mid-window bar proportionally", () => {
    const geometry = barGeometry(new Date(2026, 4, 18), new Date(2026, 4, 24), new Date(2026, 4, 11), 4);

    expect(geometry.leftPct).toBe(25);
    expect(geometry.widthPct).toBe(25);
  });

  it("clamps bars to the visible window", () => {
    const geometry = barGeometry(new Date(2026, 4, 1), new Date(2026, 4, 24), new Date(2026, 4, 11), 2);

    expect(geometry.leftPct).toBe(0);
    expect(geometry.widthPct).toBe(100);
  });
});
