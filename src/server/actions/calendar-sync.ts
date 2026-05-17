"use server";

import { db } from "@/db";
import {
  calendarAccounts,
  calendarEvents,
  calendarSubscriptions,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { calendar_v3 } from "googleapis";
import {
  googleCalendarApi,
  googleClientForAccount,
  googleListEvents,
} from "@/lib/calendar/google-client";
import {
  appleListEvents,
  davClientForAccount,
  fetchAppleCalendars,
} from "@/lib/calendar/caldav-client";
import { parseVevent } from "@/lib/calendar/ics";
import type {
  CalendarAccount,
  CalendarSubscription,
  NewCalendarEvent,
} from "@/types";

export interface SyncSummary {
  accountId: number;
  provider: "google" | "apple";
  pulled: number;
  errors: string[];
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function googleEventToRow(
  ev: calendar_v3.Schema$Event,
  subscription: CalendarSubscription,
): Omit<NewCalendarEvent, "id" | "createdAt" | "updatedAt"> | null {
  if (!ev.id) return null;
  const allDay = !!ev.start?.date;
  const startsAt = allDay
    ? ev.start?.date ?? ""
    : ev.start?.dateTime ?? "";
  const endsAt = allDay ? ev.end?.date ?? "" : ev.end?.dateTime ?? "";
  if (!startsAt || !endsAt) return null;
  return {
    title: ev.summary ?? "(no title)",
    // Skip description on sync — remote descriptions are often huge meeting
    // invites (Teams/Zoom links, dial-ins) that clutter the local copy.
    description: null,
    location: ev.location ?? null,
    startsAt,
    endsAt,
    allDay,
    color: ev.colorId ?? null,
    source: "google",
    externalId: ev.id,
    externalCalendarId: subscription.externalCalendarId,
    externalEtag: ev.etag ?? null,
    externalUpdatedAt: ev.updated ?? null,
    deletedAt: ev.status === "cancelled" ? new Date().toISOString() : null,
  };
}

async function upsertExternalEvent(
  row: Omit<NewCalendarEvent, "id" | "createdAt" | "updatedAt">,
): Promise<void> {
  // Find by (source, externalCalendarId, externalId).
  const existing = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.source, row.source!),
        eq(calendarEvents.externalCalendarId, row.externalCalendarId!),
        eq(calendarEvents.externalId, row.externalId!),
      ),
    );

  if (existing[0]) {
    await db
      .update(calendarEvents)
      .set({ ...row, updatedAt: new Date().toISOString() })
      .where(eq(calendarEvents.id, existing[0].id));
  } else {
    await db.insert(calendarEvents).values(row);
  }
}

async function syncGoogleSubscription(
  account: CalendarAccount,
  subscription: CalendarSubscription,
  summary: SyncSummary,
): Promise<void> {
  const client = await googleClientForAccount(account);
  const api = googleCalendarApi(client);

  const now = Date.now();
  const timeMin = new Date(now - ONE_YEAR_MS).toISOString();
  const timeMax = new Date(now + ONE_YEAR_MS).toISOString();

  let listResult;
  try {
    listResult = await googleListEvents(api, subscription.externalCalendarId, {
      syncToken: subscription.syncToken ?? undefined,
      timeMin,
      timeMax,
    });
  } catch (e) {
    const err = e as { code?: number };
    if (err.code === 410) {
      // Stale token → full sync.
      listResult = await googleListEvents(api, subscription.externalCalendarId, {
        syncToken: null,
        timeMin,
        timeMax,
      });
    } else {
      summary.errors.push(
        `Google list failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return;
    }
  }

  for (const ev of listResult.events) {
    const row = googleEventToRow(ev, subscription);
    if (!row) continue;
    try {
      await upsertExternalEvent(row);
      summary.pulled++;
    } catch (e) {
      summary.errors.push(
        `Upsert ${ev.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  await db
    .update(calendarSubscriptions)
    .set({ syncToken: listResult.nextSyncToken })
    .where(eq(calendarSubscriptions.id, subscription.id));
}

async function syncAppleSubscription(
  account: CalendarAccount,
  subscription: CalendarSubscription,
  summary: SyncSummary,
): Promise<void> {
  const dav = await davClientForAccount(account);
  const calendars = await fetchAppleCalendars(dav);
  const target = calendars.find(
    (c) => c.url === subscription.externalCalendarId,
  );
  if (!target) {
    summary.errors.push(
      `Apple calendar not found: ${subscription.externalCalendarId}`,
    );
    return;
  }

  // Skip when ctag is unchanged (no remote changes).
  const currentCtag =
    typeof target.ctag === "string" ? target.ctag : undefined;
  if (currentCtag && currentCtag === subscription.ctag) return;

  const objects = await appleListEvents(dav, target);
  const now = Date.now();
  const rangeStart = new Date(now - ONE_YEAR_MS).toISOString();
  const rangeEnd = new Date(now + ONE_YEAR_MS).toISOString();
  for (const obj of objects) {
    const occurrences = parseVevent(obj.data, {
      rangeStart,
      rangeEnd,
      maxOccurrences: 500,
    });
    for (const parsed of occurrences) {
      try {
        await upsertExternalEvent({
          title: parsed.title,
          // Skip description on sync — same reason as Google above.
          description: null,
          location: parsed.location ?? null,
          startsAt: parsed.startsAt,
          endsAt: parsed.endsAt,
          allDay: parsed.allDay,
          color: null,
          source: "apple",
          externalId: parsed.uid,
          externalCalendarId: subscription.externalCalendarId,
          externalEtag: typeof obj.etag === "string" ? obj.etag : null,
          externalUpdatedAt: null,
        });
        summary.pulled++;
      } catch (e) {
        summary.errors.push(
          `Upsert ${parsed.uid}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  if (currentCtag) {
    await db
      .update(calendarSubscriptions)
      .set({ ctag: currentCtag })
      .where(eq(calendarSubscriptions.id, subscription.id));
  }
}

export async function syncAccount(accountId: number): Promise<SyncSummary> {
  const account = (
    await db
      .select()
      .from(calendarAccounts)
      .where(eq(calendarAccounts.id, accountId))
  )[0];
  if (!account) {
    return {
      accountId,
      provider: "google",
      pulled: 0,
      errors: ["Account not found"],
    };
  }

  const summary: SyncSummary = {
    accountId,
    provider: account.provider,
    pulled: 0,
    errors: [],
  };

  const subs = await db
    .select()
    .from(calendarSubscriptions)
    .where(
      and(
        eq(calendarSubscriptions.accountId, accountId),
        eq(calendarSubscriptions.syncEnabled, true),
      ),
    );

  for (const sub of subs) {
    try {
      if (account.provider === "google") {
        await syncGoogleSubscription(account, sub, summary);
      } else {
        await syncAppleSubscription(account, sub, summary);
      }
    } catch (e) {
      summary.errors.push(
        `Subscription ${sub.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  await db
    .update(calendarAccounts)
    .set({ lastSyncedAt: new Date().toISOString() })
    .where(eq(calendarAccounts.id, accountId));

  revalidatePath("/calendar");
  return summary;
}

export async function syncAllAccounts(): Promise<SyncSummary[]> {
  const accounts = await db
    .select()
    .from(calendarAccounts)
    .where(eq(calendarAccounts.isActive, true));
  const results: SyncSummary[] = [];
  for (const a of accounts) {
    results.push(await syncAccount(a.id));
  }
  return results;
}
