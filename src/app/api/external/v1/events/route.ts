import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import {
  calendarAccounts,
  calendarEvents,
  calendarProfiles,
  calendarSubscriptions,
} from "@/db/schema";
import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import { dedupeEvents } from "@/server/queries/calendar-events";
import { getDefaultProfile } from "@/server/queries/calendar-profiles";
import { eventColorValue } from "@/lib/constants";
import type { CalendarEvent } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_TZ = process.env.CALENDAR_DEFAULT_TZ || "Australia/Sydney";

interface ApiEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  calendar: string;
  profile: "personal" | "business";
  location: string;
  notes: string;
  recurring: boolean;
}

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// Format a stored datetime/date as ISO 8601 with explicit offset in
// CALENDAR_DEFAULT_TZ. All-day dates become midnight in that zone.
function toZonedISO(iso: string, allDay: boolean): string {
  // All-day stored as YYYY-MM-DD → emit midnight in the target TZ.
  if (allDay || /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : iso.slice(0, 10);
    const offset = offsetFor(new Date(`${date}T12:00:00Z`));
    return `${date}T00:00:00${offset}`;
  }
  // Datetime: parse to instant, then format wall-clock in target TZ.
  const dt = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(dt);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const h = get("hour") === "24" ? "00" : get("hour");
  const min = get("minute");
  const s = get("second");
  return `${y}-${m}-${d}T${h}:${min}:${s}${offsetFor(dt)}`;
}

// Compute the numeric offset (e.g. "+10:00", "+11:00") of CALENDAR_DEFAULT_TZ
// at the given instant. Uses formatToParts on a known-UTC base to derive it.
function offsetFor(instant: Date): string {
  // Find the wall-clock components in the target TZ.
  const tzWall = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const part = (t: string) => Number(tzWall.find((p) => p.type === t)?.value);
  const wallUtcMs = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour") === 24 ? 0 : part("hour"),
    part("minute"),
    part("second"),
  );
  const diffMinutes = (wallUtcMs - instant.getTime()) / 60000;
  const sign = diffMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(diffMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

// Bucket a profile kind into the API's two coarse profiles. Anything
// unassigned falls back to "personal".
function profileKind(kind: string | null): "personal" | "business" {
  return kind === "business" ? "business" : "personal";
}

export async function GET(req: NextRequest) {
  const expectedToken = process.env.CALENDAR_API_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: "CALENDAR_API_TOKEN is not configured on the server" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return unauthorized("Missing or malformed Authorization header");
  }
  const token = auth.slice("Bearer ".length).trim();
  if (token !== expectedToken) return unauthorized("Invalid token");

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const profileFilter = searchParams.get("profile");

  if (!from || !to) {
    return badRequest("Missing required query params 'from' and 'to' (ISO 8601)");
  }
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return badRequest("'from' and 'to' must be valid ISO 8601 datetimes");
  }
  if (profileFilter && profileFilter !== "personal" && profileFilter !== "business") {
    return badRequest("'profile' must be either 'personal' or 'business'");
  }

  // Pull events overlapping the range.
  const fromISO = fromDate.toISOString();
  const toISO = toDate.toISOString();
  const rawEvents: CalendarEvent[] = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        isNull(calendarEvents.deletedAt),
        lte(calendarEvents.startsAt, toISO),
        gte(calendarEvents.endsAt, fromISO),
      ),
    )
    .orderBy(asc(calendarEvents.startsAt), asc(calendarEvents.id));

  // Index profiles + subscriptions so we can resolve calendar / kind labels.
  const [profiles, subs, defaultProfile] = await Promise.all([
    db.select().from(calendarProfiles),
    db
      .select({
        sub: calendarSubscriptions,
        accountLabel: calendarAccounts.label,
      })
      .from(calendarSubscriptions)
      .innerJoin(
        calendarAccounts,
        eq(calendarSubscriptions.accountId, calendarAccounts.id),
      ),
    getDefaultProfile(),
  ]);
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const subByExternal = new Map(
    subs.map((s) => [s.sub.externalCalendarId, s] as const),
  );

  const resolved = rawEvents.map((ev) => {
    let pid: number | null = null;
    let calendarName = "Manual";
    if (ev.profileId) pid = ev.profileId;
    if (ev.externalCalendarId) {
      const entry = subByExternal.get(ev.externalCalendarId);
      if (entry) {
        calendarName = entry.sub.name;
        if (!pid && entry.sub.profileId) pid = entry.sub.profileId;
      }
    }
    if (!pid && defaultProfile) pid = defaultProfile.id;
    const profile = pid ? profileById.get(pid) : null;
    const kind = profileKind(profile?.kind ?? null);
    return { ev, calendarName, kind };
  });

  // Dedupe before filtering so duplicates from different calendars collapse.
  const deduped = dedupeEvents(
    resolved.map((r) => ({
      ...r.ev,
      resolvedProfileId: null,
      resolvedColorValue: eventColorValue(null),
      resolvedSubscriptionId: null,
    })),
  );
  const dedupedIds = new Set(deduped.map((e) => e.id));
  const filtered = resolved.filter((r) => dedupedIds.has(r.ev.id));

  const out: ApiEvent[] = filtered
    .filter((r) => !profileFilter || r.kind === profileFilter)
    .map((r) => ({
      id: `evt_${r.ev.id}`,
      title: r.ev.title,
      start: toZonedISO(r.ev.startsAt, r.ev.allDay),
      end: toZonedISO(r.ev.endsAt, r.ev.allDay),
      all_day: r.ev.allDay,
      calendar: r.calendarName,
      profile: r.kind,
      location: r.ev.location ?? "",
      notes: r.ev.description ?? "",
      // We don't currently track RRULE locally (Apple expansions arrive as
      // discrete occurrences; Google uses singleEvents=true). Always false.
      recurring: false,
    }));

  return NextResponse.json({ events: out });
}
