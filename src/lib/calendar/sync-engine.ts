import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type {
  CalendarAccount,
  CalendarEvent,
  CalendarSubscription,
} from "@/types";
import {
  googleCalendarApi,
  googleClientForAccount,
} from "./google-client";
import {
  appleCreateEvent,
  appleDeleteEvent,
  appleUpdateEvent,
  davClientForAccount,
  fetchAppleCalendars,
} from "./caldav-client";
import { serializeVevent } from "./ics";

// Push a local create/update to a remote calendar. For "edit" of an event that
// already has an externalId, this performs an update; otherwise a create.
export async function pushUpsertEvent(
  account: CalendarAccount,
  subscription: CalendarSubscription,
  event: CalendarEvent,
): Promise<void> {
  // Avoid sync loops: never push back an event that originated from another
  // provider — we only sync local ↔ chosen provider.
  if (event.source !== "local" && event.source !== account.provider) return;

  if (account.provider === "google") {
    await pushGoogle(account, subscription, event);
    return;
  }
  await pushApple(account, subscription, event);
}

export async function pushDeleteEvent(
  account: CalendarAccount,
  subscription: CalendarSubscription,
  event: CalendarEvent,
): Promise<void> {
  if (!event.externalId) return;
  if (account.provider === "google") {
    const client = await googleClientForAccount(account);
    const api = googleCalendarApi(client);
    try {
      await api.events.delete({
        calendarId: subscription.externalCalendarId,
        eventId: event.externalId,
      });
    } catch {
      // already deleted upstream → ignore
    }
    return;
  }
  // Apple: locate object then delete.
  const client = await davClientForAccount(account);
  const calendars = await fetchAppleCalendars(client);
  const cal = calendars.find((c) => c.url === subscription.externalCalendarId);
  if (!cal) return;
  const objects = await client.fetchCalendarObjects({ calendar: cal });
  const obj = objects.find((o) => o.data?.includes(`UID:${event.externalId}`));
  if (obj) await appleDeleteEvent(client, obj);
}

async function pushGoogle(
  account: CalendarAccount,
  subscription: CalendarSubscription,
  event: CalendarEvent,
): Promise<void> {
  const client = await googleClientForAccount(account);
  const api = googleCalendarApi(client);

  const requestBody = {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: event.allDay
      ? { date: event.startsAt.slice(0, 10) }
      : { dateTime: event.startsAt },
    end: event.allDay
      ? { date: event.endsAt.slice(0, 10) }
      : { dateTime: event.endsAt },
  };

  if (event.externalId) {
    const res = await api.events.patch({
      calendarId: subscription.externalCalendarId,
      eventId: event.externalId,
      requestBody,
    });
    await db
      .update(calendarEvents)
      .set({
        externalEtag: res.data.etag ?? null,
        externalUpdatedAt: res.data.updated ?? null,
      })
      .where(eq(calendarEvents.id, event.id));
    return;
  }

  const res = await api.events.insert({
    calendarId: subscription.externalCalendarId,
    requestBody,
  });
  if (!res.data.id) return;
  await db
    .update(calendarEvents)
    .set({
      externalId: res.data.id,
      externalCalendarId: subscription.externalCalendarId,
      externalEtag: res.data.etag ?? null,
      externalUpdatedAt: res.data.updated ?? null,
    })
    .where(eq(calendarEvents.id, event.id));
}

async function pushApple(
  account: CalendarAccount,
  subscription: CalendarSubscription,
  event: CalendarEvent,
): Promise<void> {
  const client = await davClientForAccount(account);
  const calendars = await fetchAppleCalendars(client);
  const cal = calendars.find((c) => c.url === subscription.externalCalendarId);
  if (!cal) throw new Error("Apple calendar not found for subscription");

  const uid = event.externalId ?? `impact-list-${event.id}@local`;
  const ics = serializeVevent({
    uid,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: event.allDay,
  });

  if (event.externalId) {
    const objects = await client.fetchCalendarObjects({ calendar: cal });
    const existing = objects.find((o) => o.data?.includes(`UID:${event.externalId}`));
    if (existing) {
      await appleUpdateEvent(client, existing, ics);
      return;
    }
    // Fall through to create if we lost the object reference.
  }

  await appleCreateEvent(client, cal, ics, `${uid}.ics`);
  // Mark the event as bound to this Apple calendar.
  await db
    .update(calendarEvents)
    .set({
      externalId: uid,
      externalCalendarId: subscription.externalCalendarId,
    })
    .where(and(eq(calendarEvents.id, event.id)));
}
