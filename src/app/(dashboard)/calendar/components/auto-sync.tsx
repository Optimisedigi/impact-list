"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface AutoSyncProps {
  enabled: boolean;
}

// Background poller. While the calendar tab is mounted and at least one
// calendar account is connected, hit /api/calendar/sync every 5 minutes and
// refresh the route afterwards so any newly-pulled events appear.
// Pauses when the tab is hidden to avoid burning quota.
export function AutoSync({ enabled }: AutoSyncProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function tick() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/calendar/sync", { method: "POST" });
        if (!cancelled && res.ok) router.refresh();
      } catch {
        // Network/transient failure — ignore; next tick will retry.
      }
    }

    // Fire once shortly after mount so the user sees fresh data, then poll.
    const initial = setTimeout(tick, 2000);
    timer = setInterval(tick, SYNC_INTERVAL_MS);

    function onVisibility() {
      if (!document.hidden) void tick();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, router]);

  return null;
}
