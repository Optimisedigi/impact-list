import { NextResponse } from "next/server";
import { beginKimiDeviceLogin } from "@/lib/kimi-oauth";

const DEVICE_COOKIE = "kimi-device-code";
const DEVICE_ID_COOKIE = "kimi-device-id";

export async function POST() {
  let result;
  try {
    result = await beginKimiDeviceLogin();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Kimi login failed" }, { status: 502 });
  }

  const res = NextResponse.json({
    userCode: result.userCode,
    verificationUri: result.verificationUri,
    expiresIn: result.expiresIn,
    interval: result.interval,
  });
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: result.expiresIn + 60,
    path: "/",
  };
  res.cookies.set(DEVICE_COOKIE, result.deviceCode, cookieOptions);
  res.cookies.set(DEVICE_ID_COOKIE, result.deviceId, cookieOptions);
  return res;
}
