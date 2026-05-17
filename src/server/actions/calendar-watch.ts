"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/db";
import {
  calendarAccounts,
  calendarSubscriptions,
} from "@/db/schema";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import {
  googleCalendarApi,
  googleClientForAccount,
} from "@/lib/calendar/google-client";

const WATCH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Register a Google push channel for one subscription.
export async function registerGoogleWatch(subscriptionId: number): Promise<void> {
  const webhookUrl = process.env.GOOGLE_WEBHOOK_URL;
  if (!webhookUrl) return; // polling-only mode

  const sub = (
    await db
      .select()
      .from(calendarSubscriptions)
      .where(eq(calendarSubscriptions.id, subscriptionId))
  )[0];
  if (!sub) return;
  const account = (
    await db
      .select()
      .from(calendarAccounts)
      .where(eq(calendarAccounts.id, sub.accountId))
  )[0];
  if (!account || account.provider !== "google") return;

  const client = await googleClientForAccount(account);
  const api = googleCalendarApi(client);
  const id = randomBytes(16).toString("hex");
  const expiration = String(Date.now() + WATCH_TTL_MS);

  const res = await api.events.watch({
    calendarId: sub.externalCalendarId,
    requestBody: {
      id,
      type: "web_hook",
      address: webhookUrl,
      expiration,
    },
  });
  await db
    .update(calendarSubscriptions)
    .set({
      channelId: id,
      channelResourceId: res.data.resourceId ?? null,
      channelExpiresAt: res.data.expiration
        ? new Date(Number(res.data.expiration)).toISOString()
        : new Date(Date.now() + WATCH_TTL_MS).toISOString(),
    })
    .where(eq(calendarSubscriptions.id, sub.id));
}

// Renew channels that are nearing expiry (run from a cron). For each, stop the
// current channel and register a new one.
export async function renewExpiringGoogleWatches(): Promise<{ renewed: number }> {
  const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const expiring = await db
    .select()
    .from(calendarSubscriptions)
    .where(
      and(
        isNotNull(calendarSubscriptions.channelId),
        lt(calendarSubscriptions.channelExpiresAt, threshold),
      ),
    );

  let renewed = 0;
  for (const sub of expiring) {
    try {
      const account = (
        await db
          .select()
          .from(calendarAccounts)
          .where(eq(calendarAccounts.id, sub.accountId))
      )[0];
      if (!account || account.provider !== "google") continue;
      const client = await googleClientForAccount(account);
      const api = googleCalendarApi(client);
      if (sub.channelId && sub.channelResourceId) {
        try {
          await api.channels.stop({
            requestBody: { id: sub.channelId, resourceId: sub.channelResourceId },
          });
        } catch {
          // Already expired/invalid — ignore.
        }
      }
      await registerGoogleWatch(sub.id);
      renewed++;
    } catch {
      // Skip and continue.
    }
  }
  return { renewed };
}
