import { NextRequest, NextResponse } from "next/server";
import { pollKimiDeviceToken } from "@/lib/kimi-oauth";
import { upsertKimiCredential } from "@/server/actions/ai-credentials";

const DEVICE_COOKIE = "kimi-device-code";
const DEVICE_ID_COOKIE = "kimi-device-id";

function clearDeviceCookies(res: NextResponse): void {
  res.cookies.delete(DEVICE_COOKIE);
  res.cookies.delete(DEVICE_ID_COOKIE);
}

export async function POST(req: NextRequest) {
  const deviceCode = req.cookies.get(DEVICE_COOKIE)?.value;
  const deviceId = req.cookies.get(DEVICE_ID_COOKIE)?.value;
  if (!deviceCode || !deviceId) {
    return NextResponse.json(
      { error: "No Kimi login in progress; click Connect Kimi again." },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await pollKimiDeviceToken(deviceCode, deviceId);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Kimi login failed" }, { status: 502 });
  }

  if (result.status === "connected") {
    await upsertKimiCredential(result.credential);
    const res = NextResponse.json({ status: "connected" });
    clearDeviceCookies(res);
    return res;
  }

  if (result.status === "expired" || result.status === "denied") {
    const res = NextResponse.json({ status: result.status });
    clearDeviceCookies(res);
    return res;
  }

  return NextResponse.json({ status: result.status });
}
