import { describe, expect, it } from "vitest";

import { formatTimeLabel, parseLooseTime, timeValueToMinutes } from "../time-field";

describe("parseLooseTime", () => {
  it("accepts the shorthand people actually type", () => {
    expect(parseLooseTime("9")).toBe("09:00");
    expect(parseLooseTime("930")).toBe("09:30");
    expect(parseLooseTime("9:30")).toBe("09:30");
    expect(parseLooseTime("9.30")).toBe("09:30");
    expect(parseLooseTime("1430")).toBe("14:30");
  });

  it("handles am/pm, including the 12 o'clock edge cases", () => {
    expect(parseLooseTime("9pm")).toBe("21:00");
    expect(parseLooseTime("9:30 PM")).toBe("21:30");
    expect(parseLooseTime("12am")).toBe("00:00");
    expect(parseLooseTime("12pm")).toBe("12:00");
  });

  it("rejects impossible or empty input", () => {
    expect(parseLooseTime("")).toBeNull();
    expect(parseLooseTime("25:00")).toBeNull();
    expect(parseLooseTime("9:75")).toBeNull();
    expect(parseLooseTime("13pm")).toBeNull();
    expect(parseLooseTime("lunch")).toBeNull();
  });
});

describe("formatTimeLabel", () => {
  it("renders a stable 12-hour label", () => {
    expect(formatTimeLabel("00:00")).toBe("12:00 am");
    expect(formatTimeLabel("09:05")).toBe("9:05 am");
    expect(formatTimeLabel("12:00")).toBe("12:00 pm");
    expect(formatTimeLabel("22:15")).toBe("10:15 pm");
    expect(formatTimeLabel("")).toBe("");
  });
});

describe("timeValueToMinutes", () => {
  it("converts HH:MM and rejects junk", () => {
    expect(timeValueToMinutes("10:30")).toBe(630);
    expect(timeValueToMinutes("24:00")).toBeNull();
    expect(timeValueToMinutes("nope")).toBeNull();
  });
});
