import { db } from "@/db";
import { calendarProfiles } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { CalendarProfile } from "@/types";
import { EVENT_COLORS, eventColorValue } from "@/lib/constants";

export interface ProfileWithColor extends CalendarProfile {
  colorValue: string; // resolved OKLCH string for rendering
}

const DEFAULT_PROFILE_NAME = "Calendar";

export async function getProfiles(): Promise<ProfileWithColor[]> {
  const rows = await db
    .select()
    .from(calendarProfiles)
    .orderBy(asc(calendarProfiles.sortOrder), asc(calendarProfiles.id));
  // Auto-create the "Other" default profile on first read so the UI always
  // has something to assign to.
  if (rows.length === 0) {
    await db.insert(calendarProfiles).values({
      name: DEFAULT_PROFILE_NAME,
      colorKey: "gray",
      isDefault: true,
      sortOrder: 0,
    });
    return getProfiles();
  }
  return rows.map((p) => ({ ...p, colorValue: eventColorValue(p.colorKey) }));
}

export async function getDefaultProfile(): Promise<ProfileWithColor | null> {
  const profiles = await getProfiles();
  return profiles.find((p) => p.isDefault) ?? profiles[0] ?? null;
}

// Helper for resolving an event's final color taking profile precedence
// into account. Used both by query layer and by the grid.
export function resolveEventColor(input: {
  eventColor: string | null;
  subscriptionProfileColor: string | null;
  localProfileColor: string | null;
  defaultProfileColor: string | null;
}): string {
  if (input.subscriptionProfileColor) return input.subscriptionProfileColor;
  if (input.localProfileColor) return input.localProfileColor;
  if (input.eventColor) return eventColorValue(input.eventColor);
  if (input.defaultProfileColor) return input.defaultProfileColor;
  return EVENT_COLORS[0].color;
}

export async function getProfileById(id: number): Promise<CalendarProfile | null> {
  const rows = await db
    .select()
    .from(calendarProfiles)
    .where(eq(calendarProfiles.id, id));
  return rows[0] ?? null;
}
