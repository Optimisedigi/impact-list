import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { calendarSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncAccount } from "@/server/actions/calendar-sync";

export const dynamic = "force-dynamic";

// Google Calendar push notifications: https://developers.google.com/calendar/api/guides/push
// Headers: x-goog-channel-id, x-goog-resource-id, x-goog-resource-state.
export async function POST(req: NextRequest) {
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceState = req.headers.get("x-goog-resource-state");

  if (!channelId) return NextResponse.json({ ok: true });
  // "sync" notifications are sent once on registration — ignore.
  if (resourceState === "sync") return NextResponse.json({ ok: true });

  const sub = (
    await db
      .select()
      .from(calendarSubscriptions)
      .where(eq(calendarSubscriptions.channelId, channelId))
  )[0];
  if (!sub) return NextResponse.json({ ok: true });

  // Fire-and-forget sync — webhook handler should respond quickly.
  void syncAccount(sub.accountId);

  return NextResponse.json({ ok: true });
}
