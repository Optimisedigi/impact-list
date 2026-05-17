import { db } from "@/db";
import { calendarAccounts, calendarSubscriptions } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { CalendarAccount, CalendarSubscription } from "@/types";

export interface AccountWithSubscriptions {
  account: CalendarAccount;
  subscriptions: CalendarSubscription[];
}

export async function getAccountsWithSubscriptions(): Promise<
  AccountWithSubscriptions[]
> {
  const accounts = await db
    .select()
    .from(calendarAccounts)
    .orderBy(asc(calendarAccounts.createdAt));
  const out: AccountWithSubscriptions[] = [];
  for (const account of accounts) {
    const subs = await db
      .select()
      .from(calendarSubscriptions)
      .where(eq(calendarSubscriptions.accountId, account.id))
      .orderBy(asc(calendarSubscriptions.name));
    out.push({ account, subscriptions: subs });
  }
  return out;
}
