import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Temporary debug endpoint. Reports whether each Google env var is set and
// shows a masked preview so we can spot typos / whitespace without leaking
// secrets. Remove once OAuth is working in production.
function preview(value: string | undefined): {
  set: boolean;
  length: number;
  preview: string;
  hasWhitespace: boolean;
} {
  if (!value) return { set: false, length: 0, preview: "", hasWhitespace: false };
  const trimmed = value.trim();
  const hasWhitespace = trimmed.length !== value.length || /\s/.test(value);
  if (trimmed.length < 8) {
    return { set: true, length: value.length, preview: "(too short)", hasWhitespace };
  }
  return {
    set: true,
    length: value.length,
    preview: `${trimmed.slice(0, 4)}…${trimmed.slice(-12)}`,
    hasWhitespace,
  };
}

export async function GET() {
  return NextResponse.json({
    GOOGLE_CLIENT_ID: preview(process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: preview(process.env.GOOGLE_CLIENT_SECRET),
    GOOGLE_REDIRECT_URI: preview(process.env.GOOGLE_REDIRECT_URI),
    CALENDAR_ENCRYPTION_KEY: preview(process.env.CALENDAR_ENCRYPTION_KEY),
  });
}
