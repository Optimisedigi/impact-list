import { db } from "@/db";
import { calendarAccounts, calendarSubscriptions } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export interface CalendarTarget {
  subscriptionId: number;
  accountId: number;
  provider: "google" | "apple";
  accountLabel: string;
  calendarName: string;
  externalCalendarId: string;
  profileId: number | null;
}

// All write-enabled subscriptions across active accounts. A user-picked one
// of these becomes the target Google/Apple calendar for an event.
export async function getCalendarTargets(): Promise<CalendarTarget[]> {
  const rows = await db
    .select({
      subscriptionId: calendarSubscriptions.id,
      accountId: calendarAccounts.id,
      provider: calendarAccounts.provider,
      accountLabel: calendarAccounts.label,
      calendarName: calendarSubscriptions.name,
      externalCalendarId: calendarSubscriptions.externalCalendarId,
      profileId: calendarSubscriptions.profileId,
    })
    .from(calendarSubscriptions)
    .innerJoin(
      calendarAccounts,
      eq(calendarSubscriptions.accountId, calendarAccounts.id),
    )
    .where(
      and(
        eq(calendarSubscriptions.writeEnabled, true),
        eq(calendarAccounts.isActive, true),
      ),
    )
    .orderBy(asc(calendarAccounts.label), asc(calendarSubscriptions.name));
  return rows;
}
