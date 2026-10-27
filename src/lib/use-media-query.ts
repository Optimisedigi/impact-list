"use client";

import { useCallback, useSyncExternalStore } from "react";

function canMatchMedia(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

/**
 * Whether a CSS media query currently matches. Returns `serverValue` during SSR
 * and the hydration render (and where `matchMedia` is unavailable), then tracks
 * the live result.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatchMedia()) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => (canMatchMedia() ? window.matchMedia(query).matches : serverValue),
    () => serverValue,
  );
}
