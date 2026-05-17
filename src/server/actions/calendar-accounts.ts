"use server";

import { db } from "@/db";
import {
  calendarAccounts,
  calendarEvents,
  calendarSubscriptions,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  davClientForAccount,
  fetchAppleCalendars,
} from "@/lib/calendar/caldav-client";
import {
  googleCalendarApi,
  googleClientForAccount,
} from "@/lib/calendar/google-client";

export async function toggleSubscriptionFlag(
  subscriptionId: number,
  field: "syncEnabled" | "writeEnabled" | "visibleByDefault",
  value: boolean,
) {
  await db
    .update(calendarSubscriptions)
    .set({ [field]: value })
    .where(eq(calendarSubscriptions.id, subscriptionId));
  revalidatePath("/settings/calendar-accounts");
  revalidatePath("/settings");
  revalidatePath("/calendar");
}

// Re-discover the calendars exposed by an account's provider and bring the
// local subscription rows in sync:
//  - new upstream calendars → inserted as subscriptions
//  - renamed/recolored calendars → local row updated to match
//  - removed upstream calendars → local row + its events deleted
export async function refreshAccountCalendars(
  accountId: number,
): Promise<{ added: number; updated: number; removed: number; total: number }> {
  const acc = (
    await db
      .select()
      .from(calendarAccounts)
      .where(eq(calendarAccounts.id, accountId))
  )[0];
  if (!acc) return { added: 0, updated: 0, removed: 0, total: 0 };

  const existing = await db
    .select()
    .from(calendarSubscriptions)
    .where(eq(calendarSubscriptions.accountId, accountId));
  const existingByExternalId = new Map(
    existing.map((s) => [s.externalCalendarId, s] as const),
  );

  let discovered: { id: string; name: string; color: string | null }[] = [];

  if (acc.provider === "apple") {
    const client = await davClientForAccount(acc);
    const cals = await fetchAppleCalendars(client);
    discovered = cals
      .filter((c) => !!c.url)
      .map((c) => ({
        id: c.url!,
        name:
          typeof c.displayName === "string" ? c.displayName : c.url!,
        color:
          typeof c.calendarColor === "string" ? c.calendarColor : null,
      }));
  } else {
    const client = await googleClientForAccount(acc);
    const api = googleCalendarApi(client);
    const res = await api.calendarList.list();
    discovered = (res.data.items ?? [])
      .filter((c) => !!c.id)
      .map((c) => ({
        id: c.id!,
        name: c.summary ?? c.id!,
        color: c.backgroundColor ?? null,
      }));
  }

  const discoveredIds = new Set(discovered.map((d) => d.id));

  let added = 0;
  let updated = 0;
  for (const cal of discovered) {
    const local = existingByExternalId.get(cal.id);
    if (!local) {
      await db.insert(calendarSubscriptions).values({
        accountId: acc.id,
        externalCalendarId: cal.id,
        name: cal.name,
        color: cal.color,
        syncEnabled: true,
        writeEnabled: true,
      });
      added++;
      continue;
    }
    // Patch name/color when they drift. Leaves user-managed fields like
    // profileId / syncEnabled / writeEnabled / visibleByDefault alone.
    if (local.name !== cal.name || local.color !== cal.color) {
      await db
        .update(calendarSubscriptions)
        .set({ name: cal.name, color: cal.color })
        .where(eq(calendarSubscriptions.id, local.id));
      updated++;
    }
  }

  // Anything we have locally but the provider no longer reports is gone.
  // Wipe its events too so the calendar view doesn't keep showing stale data.
  let removed = 0;
  for (const local of existing) {
    if (discoveredIds.has(local.externalCalendarId)) continue;
    await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.externalCalendarId, local.externalCalendarId));
    await db
      .delete(calendarSubscriptions)
      .where(eq(calendarSubscriptions.id, local.id));
    removed++;
  }

  revalidatePath("/settings/calendar-accounts");
  revalidatePath("/settings");
  revalidatePath("/calendar");
  return { added, updated, removed, total: discovered.length };
}

// Hard-delete every event that was pulled from one subscription's remote
// calendar. Also flips its sync flag off so they don't come back on the next
// pull. Useful when you want to hide a calendar entirely without disconnecting
// the whole account.
export async function clearSubscriptionEvents(
  subscriptionId: number,
): Promise<{ deleted: number }> {
  const sub = (
    await db
      .select()
      .from(calendarSubscriptions)
      .where(eq(calendarSubscriptions.id, subscriptionId))
  )[0];
  if (!sub) return { deleted: 0 };

  const result = await db
    .delete(calendarEvents)
    .where(eq(calendarEvents.externalCalendarId, sub.externalCalendarId))
    .returning({ id: calendarEvents.id });

  await db
    .update(calendarSubscriptions)
    .set({ syncEnabled: false, writeEnabled: false })
    .where(eq(calendarSubscriptions.id, subscriptionId));

  revalidatePath("/settings/calendar-accounts");
  revalidatePath("/settings");
  revalidatePath("/calendar");
  return { deleted: result.length };
}

export async function disconnectAccount(
  accountId: number,
  options: { deleteEvents?: boolean } = {},
) {
  if (options.deleteEvents) {
    // Hard-delete events that originated from this account's subscriptions.
    const subs = await db
      .select()
      .from(calendarSubscriptions)
      .where(eq(calendarSubscriptions.accountId, accountId));
    for (const sub of subs) {
      await db
        .delete(calendarEvents)
        .where(eq(calendarEvents.externalCalendarId, sub.externalCalendarId));
    }
  }
  await db.delete(calendarAccounts).where(eq(calendarAccounts.id, accountId));
  revalidatePath("/settings/calendar-accounts");
  revalidatePath("/settings");
  revalidatePath("/calendar");
}
