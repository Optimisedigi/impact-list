import { describe, expect, it } from "vitest";
import { parseVevent, serializeVevent } from "../ics";

describe("VEVENT round-trip", () => {
  it("serializes and parses an all-day event", () => {
    const ics = serializeVevent({
      uid: "test-1@local",
      title: "Trip to NZ",
      description: null,
      location: null,
      startsAt: "2026-04-18",
      endsAt: "2026-04-27",
      allDay: true,
    });
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:test-1@local");
    expect(ics).toContain("SUMMARY:Trip to NZ");

    const parsed = parseVevent(ics);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.title).toBe("Trip to NZ");
    expect(parsed[0]!.allDay).toBe(true);
    expect(parsed[0]!.startsAt).toBe("2026-04-18");
    expect(parsed[0]!.endsAt).toBe("2026-04-27");
  });

  it("serializes and parses a timed event", () => {
    const ics = serializeVevent({
      uid: "test-2@local",
      title: "Meeting",
      description: "Sync with team",
      location: "Zoom",
      startsAt: "2026-03-15T09:00:00.000Z",
      endsAt: "2026-03-15T10:00:00.000Z",
      allDay: false,
    });
    const parsed = parseVevent(ics);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.allDay).toBe(false);
    expect(parsed[0]!.title).toBe("Meeting");
    expect(parsed[0]!.description).toBe("Sync with team");
    expect(parsed[0]!.location).toBe("Zoom");
    expect(parsed[0]!.startsAt).toBe("2026-03-15T09:00:00.000Z");
    expect(parsed[0]!.endsAt).toBe("2026-03-15T10:00:00.000Z");
  });

  it("returns an empty array for invalid ICS", () => {
    expect(parseVevent("not an ical")).toEqual([]);
  });

  // Regression: naive datetimes are stored as Sydney wall-clock. Using
  // `new Date(iso)` would parse them in the server's TZ (UTC in prod),
  // shifting Sun 23 Aug 16:00 to Mon 24 Aug 02:00 in Apple Calendar.
  it("serializes a naive Sydney datetime to the correct UTC instant", () => {
    const originalTZ = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      const ics = serializeVevent({
        uid: "tz-test@local",
        title: "Sun 4pm Sydney",
        description: null,
        location: null,
        startsAt: "2026-08-23T16:00:00",
        endsAt: "2026-08-23T17:00:00",
        allDay: false,
      });
      // August in Sydney = AEST (UTC+10), no DST. 16:00 → 06:00Z.
      expect(ics).toContain("DTSTART:20260823T060000Z");
      expect(ics).toContain("DTEND:20260823T070000Z");
    } finally {
      process.env.TZ = originalTZ;
    }
  });

  it("does not duplicate the VALUE=DATE parameter on all-day events", () => {
    const ics = serializeVevent({
      uid: "allday-param@local",
      title: "All-day",
      description: null,
      location: null,
      startsAt: "2026-08-23",
      endsAt: "2026-08-24",
      allDay: true,
    });
    expect(ics).not.toMatch(/VALUE=DATE;VALUE=DATE/);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260823");
  });

  it("expands a yearly recurring event within a window", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Test//EN",
      "BEGIN:VEVENT",
      "UID:annual-1@local",
      "DTSTAMP:20200101T000000Z",
      "DTSTART;VALUE=DATE:20200315",
      "DTEND;VALUE=DATE:20200316",
      "SUMMARY:Annual review",
      "RRULE:FREQ=YEARLY",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const parsed = parseVevent(ics, {
      rangeStart: "2025-01-01T00:00:00Z",
      rangeEnd: "2028-01-01T00:00:00Z",
    });
    // 2025, 2026, 2027 → three occurrences.
    expect(parsed.map((p) => p.startsAt)).toEqual([
      "2025-03-15",
      "2026-03-15",
      "2027-03-15",
    ]);
    // Each occurrence gets a derived UID so they don't collide on upsert.
    expect(new Set(parsed.map((p) => p.uid)).size).toBe(3);
    for (const p of parsed) {
      expect(p.title).toBe("Annual review");
      expect(p.allDay).toBe(true);
    }
  });

  it("expands a half-yearly recurring event", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Test//EN",
      "BEGIN:VEVENT",
      "UID:half-yearly@local",
      "DTSTAMP:20260101T000000Z",
      "DTSTART;VALUE=DATE:20260201",
      "DTEND;VALUE=DATE:20260202",
      "SUMMARY:Check-in",
      "RRULE:FREQ=MONTHLY;INTERVAL=6",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const parsed = parseVevent(ics, {
      rangeStart: "2026-01-01T00:00:00Z",
      rangeEnd: "2027-12-31T00:00:00Z",
    });
    // 2026-02, 2026-08, 2027-02, 2027-08 → four occurrences.
    expect(parsed.map((p) => p.startsAt)).toEqual([
      "2026-02-01",
      "2026-08-01",
      "2027-02-01",
      "2027-08-01",
    ]);
  });

  it("respects maxOccurrences cap on unbounded recurrences", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Test//EN",
      "BEGIN:VEVENT",
      "UID:daily@local",
      "DTSTAMP:20260101T000000Z",
      "DTSTART;VALUE=DATE:20260101",
      "DTEND;VALUE=DATE:20260102",
      "SUMMARY:Daily standup",
      "RRULE:FREQ=DAILY",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const parsed = parseVevent(ics, {
      rangeStart: "2026-01-01T00:00:00Z",
      rangeEnd: "2030-01-01T00:00:00Z",
      maxOccurrences: 50,
    });
    expect(parsed).toHaveLength(50);
  });
});
