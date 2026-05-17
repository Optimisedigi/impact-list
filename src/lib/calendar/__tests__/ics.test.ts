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
    expect(parsed).not.toBeNull();
    expect(parsed!.title).toBe("Trip to NZ");
    expect(parsed!.allDay).toBe(true);
    expect(parsed!.startsAt).toBe("2026-04-18");
    expect(parsed!.endsAt).toBe("2026-04-27");
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
    expect(parsed).not.toBeNull();
    expect(parsed!.allDay).toBe(false);
    expect(parsed!.title).toBe("Meeting");
    expect(parsed!.description).toBe("Sync with team");
    expect(parsed!.location).toBe("Zoom");
    expect(parsed!.startsAt).toBe("2026-03-15T09:00:00.000Z");
    expect(parsed!.endsAt).toBe("2026-03-15T10:00:00.000Z");
  });

  it("returns null for invalid ICS", () => {
    expect(parseVevent("not an ical")).toBeNull();
  });
});
