import { describe, expect, it } from "vitest";
import { seasonForMonth } from "../seasons";

describe("seasonForMonth", () => {
  it("maps northern hemisphere months to meteorological seasons", () => {
    expect(seasonForMonth(0, "north")).toBe("winter");   // Jan
    expect(seasonForMonth(2, "north")).toBe("spring");   // Mar
    expect(seasonForMonth(5, "north")).toBe("summer");   // Jun
    expect(seasonForMonth(8, "north")).toBe("autumn");   // Sep
    expect(seasonForMonth(11, "north")).toBe("winter");  // Dec
  });

  it("inverts seasons for the southern hemisphere", () => {
    expect(seasonForMonth(0, "south")).toBe("summer");
    expect(seasonForMonth(2, "south")).toBe("autumn");
    expect(seasonForMonth(5, "south")).toBe("winter");
    expect(seasonForMonth(8, "south")).toBe("spring");
    expect(seasonForMonth(11, "south")).toBe("summer");
  });

  it("defaults to southern hemisphere", () => {
    expect(seasonForMonth(0)).toBe("summer");
  });
});
