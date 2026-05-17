import { db } from "@/db";
import {
  calendarEvents,
  calendarProfiles,
  calendarSubscriptions,
} from "@/db/schema";
import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import type { CalendarEvent } from "@/types";
import { getDefaultProfile } from "./calendar-profiles";
import { eventColorValue } from "@/lib/constants";

export interface ResolvedEvent extends CalendarEvent {
  // The profile that gives this event its visual identity. May be the
  // subscription's profile (remote events) or the event's own profile (local).
  // Falls back to the default profile when nothing else applies.
  resolvedProfileId: number | null;
  resolvedColorValue: string;
  // The subscription (calendar) this event came from, if any. Used for
  // per-calendar filtering on the calendar view.
  resolvedSubscriptionId: number | null;
}

// Returns events overlapping the given inclusive date range.
// Datetime strings are ISO 8601, so string comparison is correct.
export async function getEventsForRange(
  startISO: string,
  endISO: string,
): Promise<CalendarEvent[]> {
  // Overlap: event.startsAt <= rangeEnd AND event.endsAt >= rangeStart.
  return db
    .select()
    .from(calendarEvents)
    .where(
      and(
        isNull(calendarEvents.deletedAt),
        lte(calendarEvents.startsAt, endISO),
        gte(calendarEvents.endsAt, startISO),
      ),
    )
    .orderBy(asc(calendarEvents.startsAt), asc(calendarEvents.id));
}

export async function getEventsForYear(year: number): Promise<CalendarEvent[]> {
  const start = `${year}-01-01`;
  const end = `${year}-12-31T23:59:59.999`;
  return getEventsForRange(start, end);
}

// Resolve each event's profile + color. Subscription profile wins over the
// event's own color/profile; the default profile ("Other") backs everything
// up. Near-duplicate events (same date, same fuzzy title) are collapsed so
// the grid never shows the same thing twice.
export async function getResolvedEventsForYear(
  year: number,
): Promise<ResolvedEvent[]> {
  const events = await getEventsForYear(year);
  const [subs, profileRows, defaultProfile] = await Promise.all([
    db.select().from(calendarSubscriptions),
    db.select().from(calendarProfiles),
    getDefaultProfile(),
  ]);
  // Index profiles by id and subscriptions by externalCalendarId for O(1) lookup.
  const profileById = new Map(profileRows.map((p) => [p.id, p]));
  const subByExternal = new Map(
    subs.map((s) => [s.externalCalendarId, s] as const),
  );

  const resolved: ResolvedEvent[] = events.map((ev) => {
    let profileId: number | null = null;
    let subscriptionId: number | null = null;
    // 1. Per-event override (set explicitly via the event dialog) wins.
    if (ev.profileId) profileId = ev.profileId;
    // 2. Subscription's profile (remote events) for any event without an
    //    explicit override.
    if (ev.externalCalendarId) {
      const sub = subByExternal.get(ev.externalCalendarId);
      if (sub) {
        subscriptionId = sub.id;
        if (!profileId && sub.profileId) profileId = sub.profileId;
      }
    }
    // 3. Default profile ("Calendar") catches everything else.
    if (!profileId && defaultProfile) profileId = defaultProfile.id;

    const profile = profileId ? profileById.get(profileId) : null;
    const colorValue = profile
      ? eventColorValue(profile.colorKey)
      : ev.color
        ? eventColorValue(ev.color)
        : eventColorValue(null);

    return {
      ...ev,
      resolvedProfileId: profileId,
      resolvedColorValue: colorValue,
      resolvedSubscriptionId: subscriptionId,
    };
  });
  return dedupeEvents(resolved);
}

// Normalize a title for fuzzy duplicate matching: lowercase, trim, collapse
// whitespace, strip punctuation. "Team sync (weekly)!" → "team sync weekly".
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Dedupe near-identical events: same calendar date + same normalized title.
// Common case: Google invite that's also been mirrored to a shared calendar,
// or an Apple event synced from work + personal accounts. Display-time only —
// the DB still holds every copy.
export function dedupeEvents(events: ResolvedEvent[]): ResolvedEvent[] {
  const byKey = new Map<string, ResolvedEvent>();
  for (const ev of events) {
    if (ev.deletedAt) continue;
    const date = ev.startsAt.slice(0, 10);
    const key = `${date}|${normalizeTitle(ev.title)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, ev);
      continue;
    }
    // Prefer the copy users can actually edit: local > earlier createdAt.
    const prefer =
      ev.source === "local" && existing.source !== "local"
        ? ev
        : existing.source === "local" && ev.source !== "local"
          ? existing
          : ev.createdAt < existing.createdAt
            ? ev
            : existing;
    byKey.set(key, prefer);
  }
  // Preserve original ordering as best we can.
  const kept = new Set(byKey.values());
  return events.filter((e) => kept.has(e));
}

export async function getEventById(id: number): Promise<CalendarEvent | null> {
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.id, id), isNull(calendarEvents.deletedAt)));
  return rows[0] ?? null;
}
