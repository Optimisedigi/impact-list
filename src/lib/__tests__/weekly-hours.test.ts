import { describe, expect, it } from "vitest";
import {
  averageCompletedWeekHours,
  averageOfTotals,
  formatWeekRange,
  sliceWeekWindow,
} from "../weekly-hours";

describe("sliceWeekWindow", () => {
  const weeks = [1, 2, 3, 4, 5, 6];

  it("returns the most recent weeks at offset 0", () => {
    expect(sliceWeekWindow(weeks, 4, 0)).toEqual({ weeks: [3, 4, 5, 6], offset: 0, maxOffset: 2 });
  });

  it("moves one week earlier per offset step", () => {
    expect(sliceWeekWindow(weeks, 4, 1).weeks).toEqual([2, 3, 4, 5]);
    expect(sliceWeekWindow(weeks, 4, 2).weeks).toEqual([1, 2, 3, 4]);
  });

  it("clamps offsets so the window always stays full", () => {
    expect(sliceWeekWindow(weeks, 4, 9)).toEqual({ weeks: [1, 2, 3, 4], offset: 2, maxOffset: 2 });
    expect(sliceWeekWindow(weeks, 4, -3).offset).toBe(0);
  });

  it("returns everything when there are fewer weeks than the window", () => {
    expect(sliceWeekWindow([1, 2], 4, 1)).toEqual({ weeks: [1, 2], offset: 0, maxOffset: 0 });
  });
});

describe("averageOfTotals", () => {
  it("averages only buckets with hours", () => {
    expect(averageOfTotals([10, 0, 20])).toBe(15);
    expect(averageOfTotals([0, 0])).toBe(0);
  });
});

describe("averageCompletedWeekHours", () => {
  it("leaves out the in-progress week and weeks with no hours", () => {
    expect(
      averageCompletedWeekHours([
        { total: 30, isCurrentWeek: false },
        { total: 0, isCurrentWeek: false },
        { total: 20, isCurrentWeek: false },
        { total: 4, isCurrentWeek: true },
      ]),
    ).toBe(25);
  });

  it("is zero when no completed week has hours", () => {
    expect(averageCompletedWeekHours([{ total: 5, isCurrentWeek: true }])).toBe(0);
  });
});

describe("formatWeekRange", () => {
  it("runs from the first Monday to the last Sunday", () => {
    expect(formatWeekRange("2026-09-28", "2026-10-19")).toBe("Sep 28 to Oct 25, 2026");
  });

  it("shows both years when the range crosses a year boundary", () => {
    expect(formatWeekRange("2025-12-08", "2025-12-29")).toBe("Dec 8, 2025 to Jan 4, 2026");
  });
});
