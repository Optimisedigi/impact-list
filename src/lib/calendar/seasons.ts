export type Season = "summer" | "autumn" | "winter" | "spring";
export type Hemisphere = "north" | "south";

// Default hemisphere — matches the user's source sheet (Southern Hemisphere).
export const DEFAULT_HEMISPHERE: Hemisphere = "south";

// Month index is 0-based (Jan=0..Dec=11).
export function seasonForMonth(
  monthIndex0: number,
  hemisphere: Hemisphere = DEFAULT_HEMISPHERE,
): Season {
  // Northern Hemisphere meteorological seasons:
  // Dec-Feb winter, Mar-May spring, Jun-Aug summer, Sep-Nov autumn.
  const north: Season[] = [
    "winter", "winter", "spring", "spring", "spring", "summer",
    "summer", "summer", "autumn", "autumn", "autumn", "winter",
  ];
  const m = ((monthIndex0 % 12) + 12) % 12;
  const season = north[m]!;
  if (hemisphere === "north") return season;
  // Southern Hemisphere is opposite.
  switch (season) {
    case "summer": return "winter";
    case "winter": return "summer";
    case "spring": return "autumn";
    case "autumn": return "spring";
  }
}

// Pastel tints used by the season header bands, matching the screenshot.
export const SEASON_COLORS: Record<Season, string> = {
  summer: "oklch(0.85 0.1 145)",   // green
  autumn: "oklch(0.78 0.04 250)",  // blue-grey
  winter: "oklch(0.88 0.06 230)",  // light blue
  spring: "oklch(0.85 0.1 60)",    // orange
};

export const SEASON_LABEL: Record<Season, string> = {
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
  spring: "Spring",
};
