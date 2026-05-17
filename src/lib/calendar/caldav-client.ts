import { createDAVClient, type DAVCalendar, type DAVCalendarObject } from "tsdav";
import type { CalendarAccount } from "@/types";
import { decryptSecret } from "./crypto";

export const DEFAULT_APPLE_CALDAV_URL = "https://caldav.icloud.com/";

export type DAVClientInstance = Awaited<ReturnType<typeof createDAVClient>>;

export async function davClient(opts: {
  serverUrl: string;
  username: string;
  password: string;
}): Promise<DAVClientInstance> {
  return createDAVClient({
    serverUrl: opts.serverUrl,
    credentials: { username: opts.username, password: opts.password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}

export async function davClientForAccount(
  account: CalendarAccount,
): Promise<DAVClientInstance> {
  if (
    !account.caldavUrl ||
    !account.caldavUsername ||
    !account.caldavPassword
  ) {
    throw new Error("Apple account is missing CalDAV credentials");
  }
  return davClient({
    serverUrl: account.caldavUrl,
    username: account.caldavUsername,
    password: decryptSecret(account.caldavPassword),
  });
}

export async function fetchAppleCalendars(
  client: DAVClientInstance,
): Promise<DAVCalendar[]> {
  return client.fetchCalendars();
}

export async function appleListEvents(
  client: DAVClientInstance,
  calendar: DAVCalendar,
): Promise<DAVCalendarObject[]> {
  return client.fetchCalendarObjects({ calendar });
}

export async function appleCreateEvent(
  client: DAVClientInstance,
  calendar: DAVCalendar,
  ics: string,
  filename: string,
): Promise<Response> {
  return client.createCalendarObject({
    calendar,
    filename,
    iCalString: ics,
  });
}

export async function appleUpdateEvent(
  client: DAVClientInstance,
  obj: DAVCalendarObject,
  ics: string,
): Promise<Response> {
  return client.updateCalendarObject({
    calendarObject: { ...obj, data: ics },
  });
}

export async function appleDeleteEvent(
  client: DAVClientInstance,
  obj: DAVCalendarObject,
): Promise<Response> {
  return client.deleteCalendarObject({ calendarObject: obj });
}
