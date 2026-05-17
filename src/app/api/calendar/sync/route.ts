import { NextResponse } from "next/server";
import { syncAllAccounts } from "@/server/actions/calendar-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const results = await syncAllAccounts();
  return NextResponse.json({ results });
}
