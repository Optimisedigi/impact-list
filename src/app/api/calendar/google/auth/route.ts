import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { googleAuthUrl } from "@/lib/calendar/google-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = randomBytes(16).toString("hex");
  const url = googleAuthUrl(state);
  const res = NextResponse.redirect(url);
  // CSRF: signed cookie carries the expected state.
  res.cookies.set("calendar_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
