import { google, type Auth, type calendar_v3 } from "googleapis";

type OAuth2Client = Auth.OAuth2Client;
import { db } from "@/db";
import { calendarAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "./crypto";
import type { CalendarAccount } from "@/types";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
];

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

export function googleOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    requireEnv("GOOGLE_REDIRECT_URI"),
  );
}

export function googleAuthUrl(state: string): string {
  const client = googleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
  });
}

export async function googleExchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: number | null;
  email: string;
}> {
  const client = googleOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error("Google did not return an access_token");
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh_token. Revoke the app in Google account settings and try again.",
    );
  }
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const me = await oauth2.userinfo.get();
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date ?? null,
    email: me.data.email ?? "Google account",
  };
}

// Build an authenticated client for a stored account, refreshing the access
// token via the stored refresh token when needed. Persists the new access
// token back to the DB.
export async function googleClientForAccount(
  account: CalendarAccount,
): Promise<OAuth2Client> {
  if (!account.refreshToken) {
    throw new Error("Account has no refresh token");
  }
  const client = googleOAuthClient();
  const refreshToken = decryptSecret(account.refreshToken);
  client.setCredentials({
    refresh_token: refreshToken,
    access_token: account.accessToken ?? undefined,
    expiry_date: account.tokenExpiresAt
      ? new Date(account.tokenExpiresAt).getTime()
      : undefined,
  });

  // Persist any refreshed tokens back to the DB.
  client.on("tokens", (tokens) => {
    void (async () => {
      const patch: Partial<typeof calendarAccounts.$inferInsert> = {};
      if (tokens.access_token) patch.accessToken = tokens.access_token;
      if (tokens.expiry_date)
        patch.tokenExpiresAt = new Date(tokens.expiry_date).toISOString();
      if (tokens.refresh_token)
        patch.refreshToken = encryptSecret(tokens.refresh_token);
      if (Object.keys(patch).length > 0) {
        await db
          .update(calendarAccounts)
          .set(patch)
          .where(eq(calendarAccounts.id, account.id));
      }
    })();
  });

  return client;
}

export function googleCalendarApi(client: OAuth2Client): calendar_v3.Calendar {
  return google.calendar({ version: "v3", auth: client });
}

export interface GoogleEventListResult {
  events: calendar_v3.Schema$Event[];
  nextSyncToken: string | null;
}

// Pull events for a calendar. When `syncToken` is provided we do incremental
// sync; otherwise we do a bounded full sync around `timeRange`.
// Throws an error with a `.code === 410` for stale sync tokens — caller
// should fall back to a full sync.
export async function googleListEvents(
  calendar: calendar_v3.Calendar,
  externalCalendarId: string,
  opts: { syncToken?: string | null; timeMin?: string; timeMax?: string },
): Promise<GoogleEventListResult> {
  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined = undefined;
  let nextSyncToken: string | null = null;

  // events.list supports either syncToken OR (timeMin/timeMax + singleEvents).
  do {
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId: externalCalendarId,
      pageToken,
      singleEvents: true,
      maxResults: 250,
    };
    if (opts.syncToken) {
      params.syncToken = opts.syncToken;
    } else {
      params.timeMin = opts.timeMin;
      params.timeMax = opts.timeMax;
      params.showDeleted = false;
    }
    try {
      const res = await calendar.events.list(params);
      events.push(...(res.data.items ?? []));
      pageToken = res.data.nextPageToken ?? undefined;
      if (res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken;
    } catch (e) {
      const err = e as { code?: number; status?: number };
      const code = err.code ?? err.status;
      if (code === 410) {
        const gone = new Error("Sync token invalidated; full sync required");
        (gone as Error & { code?: number }).code = 410;
        throw gone;
      }
      throw e;
    }
  } while (pageToken);

  return { events, nextSyncToken };
}
