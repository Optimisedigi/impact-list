import { describe, it, expect, vi } from "vitest";

// The module imports `@/db`; mock it so importing pure helpers doesn't touch a DB.
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/schema", () => ({ dailyTimeLogs: {} }));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  desc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
}));

import {
  aggregateStats,
  aggregateByWeek,
  aggregateByMonth,
  aggregateByCategory,
  getWeekRanges,
  getMondayOf,
  UNTAGGED_KEY,
  type DailyLogRow,
} from "../daily-logs";

describe("daily-logs pure helpers", () => {
  describe("getMondayOf", () => {
    it("returns Monday for a mid-week date", () => {
      // 2026-06-10 is a Wednesday
      const monday = getMondayOf(new Date("2026-06-10T12:00:00"));
      expect(monday.getDay()).toBe(1);
      expect(monday.getDate()).toBe(8);
    });

    it("returns previous Monday for a Sunday", () => {
      // 2026-06-14 is a Sunday
      const monday = getMondayOf(new Date("2026-06-14T12:00:00"));
      expect(monday.getDay()).toBe(1);
      expect(monday.getDate()).toBe(8);
    });
  });

  describe("aggregateStats", () => {
    it("sums hours and counts distinct logged days", () => {
      const logs: DailyLogRow[] = [
        { date: "2026-06-01", hours: 4, category: "admin" },
        { date: "2026-06-01", hours: 2, category: "client_delivery" },
        { date: "2026-06-02", hours: 6, category: null },
      ];
      const stats = aggregateStats(logs);
      expect(stats.totalHours).toBe(12);
      expect(stats.loggedDays).toBe(2);
      expect(stats.avgPerLoggedDay).toBe(6);
      expect(stats.firstLogDate).toBe("2026-06-01");
      expect(stats.lastLogDate).toBe("2026-06-02");
    });

    it("returns zeroed stats for no logs", () => {
      const stats = aggregateStats([]);
      expect(stats).toEqual({
        totalHours: 0,
        loggedDays: 0,
        avgPerLoggedDay: 0,
        firstLogDate: null,
        lastLogDate: null,
      });
    });
  });

  describe("getWeekRanges", () => {
    it("produces inclusive Monday-based weeks from start to now", () => {
      const ranges = getWeekRanges("2026-05-25", new Date("2026-06-10T12:00:00"));
      // Weeks: w/c 25 May, 1 Jun, 8 Jun => 3 weeks
      expect(ranges).toHaveLength(3);
      expect(ranges[0].weekNum).toBe(1);
      expect(ranges[ranges.length - 1].weekNum).toBe(3);
      ranges.forEach((r) => expect(r.monday.getDay()).toBe(1));
    });

    it("falls back to 12 weeks when no start date", () => {
      const ranges = getWeekRanges(null, new Date("2026-06-10T12:00:00"));
      expect(ranges).toHaveLength(12);
    });
  });

  describe("aggregateByWeek", () => {
    it("buckets hours into weeks with per-category keys and total", () => {
      const ranges = getWeekRanges("2026-06-01", new Date("2026-06-10T12:00:00"));
      const logs: DailyLogRow[] = [
        { date: "2026-06-02", hours: 3, category: "admin" },
        { date: "2026-06-03", hours: 2, category: null },
        { date: "2026-06-09", hours: 5, category: "admin" },
      ];
      const result = aggregateByWeek(logs, ranges);
      // week 1 = w/c 2026-06-01, week 2 = w/c 2026-06-08
      expect(result[0].admin).toBe(3);
      expect(result[0][UNTAGGED_KEY]).toBe(2);
      expect(result[0].total).toBe(5);
      expect(result[1].admin).toBe(5);
      expect(result[1].total).toBe(5);
    });
  });

  describe("aggregateByMonth", () => {
    it("groups totals by YYYY-MM ascending", () => {
      const logs: DailyLogRow[] = [
        { date: "2026-05-30", hours: 4, category: null },
        { date: "2026-06-01", hours: 3, category: "admin" },
        { date: "2026-06-15", hours: 2, category: "admin" },
      ];
      const result = aggregateByMonth(logs);
      expect(result).toEqual([
        { month: "2026-05", total: 4 },
        { month: "2026-06", total: 5 },
      ]);
    });
  });

  describe("aggregateByCategory", () => {
    it("sums by category and sorts descending by total", () => {
      const logs: DailyLogRow[] = [
        { date: "2026-06-01", hours: 2, category: "admin" },
        { date: "2026-06-02", hours: 5, category: "client_delivery" },
        { date: "2026-06-03", hours: 1, category: null },
      ];
      const result = aggregateByCategory(logs);
      expect(result[0]).toEqual({ category: "client_delivery", total: 5 });
      expect(result[1]).toEqual({ category: "admin", total: 2 });
      expect(result[2]).toEqual({ category: null, total: 1 });
    });
  });
});
