"use server";

import { db } from "@/db";
import {
  calendarAccounts,
  calendarEvents,
  calendarSubscriptions,
} from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { CalendarEvent, NewCalendarEvent } from "@/types";
import {
  pushDeleteEvent,
  pushUpsertEvent,
} from "@/lib/calendar/sync-engine";

export type CreateEventInput = Omit<
  NewCalendarEvent,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

export async function createCalendarEvent(
  data: CreateEventInput,
  subscriptionId?: number,
) {
  const result = await db.insert(calendarEvents).values(data).returning();
  const event = result[0]!;
  if (subscriptionId !== undefined) {
    await pushIfPossible(event, subscriptionId);
  }
  revalidatePath("/calendar");
  return event;
}

export async function updateCalendarEvent(
  id: number,
  data: Partial<Omit<NewCalendarEvent, "id" | "createdAt">>,
  subscriptionId?: number,
) {
  const result = await db
    .update(calendarEvents)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(calendarEvents.id, id))
    .returning();
  const event = result[0];
  if (event) {
    if (subscriptionId !== undefined) {
      // Caller picked a target calendar — push to that subscription.
      await pushIfPossible(event, subscriptionId);
    } else if (event.externalId && event.externalCalendarId) {
      // Existing remote event — push update back to its current calendar.
      await pushIfPossible(event, null);
    }
  }
  revalidatePath("/calendar");
  return event;
}

export async function fetchCalendarEvent(id: number): Promise<CalendarEvent | null> {
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.id, id), isNull(calendarEvents.deletedAt)));
  return rows[0] ?? null;
}

export async function deleteCalendarEvent(id: number) {
  const now = new Date().toISOString();
  const result = await db
    .update(calendarEvents)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(calendarEvents.id, id))
    .returning();
  const event = result[0];
  if (event && event.externalId && event.externalCalendarId) {
    await pushDeleteIfPossible(event);
  }
  revalidatePath("/calendar");
  return event;
}

async function findSubscription(subscriptionId: number) {
  const subs = await db
    .select()
    .from(calendarSubscriptions)
    .where(eq(calendarSubscriptions.id, subscriptionId));
  const sub = subs[0];
  if (!sub || !sub.writeEnabled) return null;
  const acc = (
    await db
      .select()
      .from(calendarAccounts)
      .where(eq(calendarAccounts.id, sub.accountId))
  )[0];
  if (!acc || !acc.isActive) return null;
  return { account: acc, subscription: sub };
}

async function findSubscriptionForEvent(event: CalendarEvent) {
  if (!event.externalCalendarId) return null;
  const subs = await db
    .select()
    .from(calendarSubscriptions)
    .where(
      eq(
        calendarSubscriptions.externalCalendarId,
        event.externalCalendarId,
      ),
    );
  const sub = subs[0];
  if (!sub || !sub.writeEnabled) return null;
  const acc = (
    await db
      .select()
      .from(calendarAccounts)
      .where(eq(calendarAccounts.id, sub.accountId))
  )[0];
  if (!acc || !acc.isActive) return null;
  return { account: acc, subscription: sub };
}

async function pushIfPossible(
  event: CalendarEvent,
  subscriptionId: number | null,
): Promise<void> {
  try {
    const target =
      subscriptionId !== null
        ? await findSubscription(subscriptionId)
        : await findSubscriptionForEvent(event);
    if (!target) return;
    await pushUpsertEvent(target.account, target.subscription, event);
  } catch {
    // Network/auth errors during push must not block local writes.
  }
}

async function pushDeleteIfPossible(event: CalendarEvent): Promise<void> {
  try {
    const target = await findSubscriptionForEvent(event);
    if (!target) return;
    await pushDeleteEvent(target.account, target.subscription, event);
  } catch {
    // ignore
  }
}
