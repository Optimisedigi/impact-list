import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { calendarAccounts, calendarSubscriptions } from "@/db/schema";
import {
  googleCalendarApi,
  googleClientForAccount,
  googleExchangeCode,
} from "@/lib/calendar/google-client";
import { encryptSecret } from "@/lib/calendar/crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = req.cookies.get("calendar_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.json(
      { error: "Invalid OAuth state" },
      { status: 400 },
    );
  }

  try {
    const tokens = await googleExchangeCode(code);

    // Insert account row.
    const inserted = await db
      .insert(calendarAccounts)
      .values({
        provider: "google",
        label: tokens.email,
        accessToken: tokens.accessToken,
        refreshToken: encryptSecret(tokens.refreshToken),
        tokenExpiresAt: tokens.expiryDate
          ? new Date(tokens.expiryDate).toISOString()
          : null,
        isActive: true,
      })
      .returning();
    const account = inserted[0]!;

    // Fetch user's calendars and create one subscription per calendar.
    const client = await googleClientForAccount(account);
    const calApi = googleCalendarApi(client);
    const list = await calApi.calendarList.list();
    const items = list.data.items ?? [];
    for (const cal of items) {
      if (!cal.id) continue;
      await db.insert(calendarSubscriptions).values({
        accountId: account.id,
        externalCalendarId: cal.id,
        name: cal.summary ?? cal.id,
        color: cal.backgroundColor ?? null,
        // Default: only the primary calendar syncs initially.
        syncEnabled: !!cal.primary,
        writeEnabled: !!cal.primary,
      });
    }

    const res = NextResponse.redirect(
      new URL("/settings/calendar-accounts", req.url),
    );
    res.cookies.delete("calendar_oauth_state");
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "OAuth failed" },
      { status: 500 },
    );
  }
}
