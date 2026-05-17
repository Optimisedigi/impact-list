import { NextResponse } from "next/server";
import { syncAllAccounts } from "@/server/actions/calendar-sync";

export const dynamic = "force-dynamic";
// Full Apple resync (with RRULE expansion) can blow past the default 10s
// Vercel function timeout. 300s is the max on Pro plans.
export const maxDuration = 300;

export async function POST() {
  const results = await syncAllAccounts();
  return NextResponse.json({ results });
}
