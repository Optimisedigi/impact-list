import { describe, expect, it } from "vitest";
import { detectFormat, parseFlatCsv, parseSheetCsv } from "../csv-parsers";

describe("detectFormat", () => {
  it("detects the sheet layout from month-name headers", () => {
    expect(
      detectFormat(["January", "February", "March", "April"]),
    ).toBe("sheet");
  });

  it("falls back to flat for arbitrary headers", () => {
    expect(detectFormat(["title", "date", "color"])).toBe("flat");
  });
});

describe("parseSheetCsv", () => {
  it("parses a single-column-per-month layout and collapses consecutive identical cells", () => {
    // Three months with 31 day-rows. April has a 3-day "Trip" span (18-20).
    const monthHeader = "January,February,March,April";
    const rows: string[] = [monthHeader];
    for (let d = 1; d <= 31; d++) {
      const jan = d === 5 ? "Standup" : "";
      const apr = d >= 18 && d <= 20 ? "Trip" : "";
      rows.push(`${jan},,,${apr}`);
    }
    const csv = rows.join("\n");
    const events = parseSheetCsv(csv, 2026);

    const jan = events.find((e) => e.title === "Standup");
    expect(jan).toBeDefined();
    expect(jan!.startsAt).toBe("2026-01-05");
    // Exclusive end → next day.
    expect(jan!.endsAt).toBe("2026-01-06");

    const trip = events.find((e) => e.title === "Trip");
    expect(trip).toBeDefined();
    expect(trip!.startsAt).toBe("2026-04-18");
    // 3-day span (18,19,20) → exclusive end 2026-04-21.
    expect(trip!.endsAt).toBe("2026-04-21");
    expect(trip!.allDay).toBe(true);
  });

  it("ignores days beyond the month's length", () => {
    const rows = ["February"];
    for (let d = 1; d <= 31; d++) {
      rows.push(d === 30 ? "should be skipped" : "");
    }
    const events = parseSheetCsv(rows.join("\n"), 2026);
    expect(events).toHaveLength(0);
  });
});

describe("parseFlatCsv", () => {
  it("parses an all-day flat CSV", () => {
    const csv = [
      "title,date,end_date,all_day,color",
      "Birthday,2026-03-15,2026-03-15,true,peach",
    ].join("\n");
    const events = parseFlatCsv(csv);
    expect(events).toHaveLength(1);
    expect(events[0]!.title).toBe("Birthday");
    expect(events[0]!.allDay).toBe(true);
    expect(events[0]!.startsAt).toBe("2026-03-15");
    expect(events[0]!.endsAt).toBe("2026-03-16");
    expect(events[0]!.color).toBe("peach");
  });

  it("parses a timed flat CSV", () => {
    const csv = [
      "title,date,end_date",
      "Meeting,2026-03-15T09:00,2026-03-15T10:00",
    ].join("\n");
    const events = parseFlatCsv(csv);
    expect(events).toHaveLength(1);
    expect(events[0]!.allDay).toBe(false);
    expect(events[0]!.startsAt).toBe("2026-03-15T09:00");
    expect(events[0]!.endsAt).toBe("2026-03-15T10:00");
  });
});
