import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { calendarAccounts, calendarSubscriptions } from "@/db/schema";
import { encryptSecret } from "@/lib/calendar/crypto";
import {
  DEFAULT_APPLE_CALDAV_URL,
  davClient,
  fetchAppleCalendars,
} from "@/lib/calendar/caldav-client";

export const dynamic = "force-dynamic";

interface Body {
  username?: string;
  password?: string;
  serverUrl?: string;
  label?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const username = body.username?.trim();
  // Strip every character that isn't a-z, 0-9, or '-'. Apple-specific
  // passwords are always lowercase alphanumerics in groups of four separated
  // by dashes; anything else snuck in from the paste (zero-width chars, NBSP,
  // smart quotes, etc.) must go.
  const password = body.password
    ?.toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

  // Helpful one-line server-side log for debugging credential issues without
  // leaking the password. Shows length + masked preview only.
  if (process.env.NODE_ENV !== "production") {
    const preview =
      password && password.length >= 4
        ? `${password.slice(0, 2)}…${password.slice(-2)}`
        : "(empty)";
    console.log(
      `[apple-connect] user=${username ?? "(empty)"} pwLen=${password?.length ?? 0} preview=${preview} matchesFormat=${password ? /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(password) : false}`,
    );
  }
  let serverUrl = body.serverUrl?.trim() || DEFAULT_APPLE_CALDAV_URL;
  if (!/\/$/.test(serverUrl)) serverUrl += "/";
  if (!username || !password) {
    return NextResponse.json(
      { error: "username and password are required" },
      { status: 400 },
    );
  }

  try {
    const client = await davClient({ serverUrl, username, password });
    const calendars = await fetchAppleCalendars(client);

    const inserted = await db
      .insert(calendarAccounts)
      .values({
        provider: "apple",
        label: body.label?.trim() || username,
        caldavUrl: serverUrl,
        caldavUsername: username,
        caldavPassword: encryptSecret(password),
        isActive: true,
      })
      .returning();
    const account = inserted[0]!;

    for (const cal of calendars) {
      if (!cal.url) continue;
      await db.insert(calendarSubscriptions).values({
        accountId: account.id,
        externalCalendarId: cal.url,
        name:
          typeof cal.displayName === "string"
            ? cal.displayName
            : cal.url,
        color: typeof cal.calendarColor === "string" ? cal.calendarColor : null,
        syncEnabled: true,
        writeEnabled: true,
      });
    }

    return NextResponse.json({
      success: true,
      accountId: account.id,
      calendarCount: calendars.length,
      calendars: calendars.map((c) => {
        const access = (c as unknown as { accessType?: string }).accessType;
        return {
          url: c.url,
          name:
            typeof c.displayName === "string" ? c.displayName : c.url ?? "(unnamed)",
          // tsdav exposes share-access info under `accessType`. Non-owners
          // are typically not "read-write".
          readOnly: typeof access === "string" && access !== "read-write",
        };
      }),
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "CalDAV connection failed";
    let hint = "";
    if (/401/.test(raw)) {
      hint =
        " — iCloud rejected the credentials. Use your full Apple ID email and an app-specific password (xxxx-xxxx-xxxx-xxxx) from appleid.apple.com → Sign-In and Security → App-Specific Passwords. Existing passwords stop working if Apple resets your security; generate a fresh one.";
    }
    return NextResponse.json(
      { error: `${raw}${hint}` },
      { status: 401 },
    );
  }
}
