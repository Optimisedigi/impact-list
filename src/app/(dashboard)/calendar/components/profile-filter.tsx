"use client";

import { useEffect, useState } from "react";
import type { ProfileWithColor } from "@/server/queries/calendar-profiles";
import { foregroundColor } from "@/lib/calendar/contrast";

const STORAGE_KEY = "calendar.hiddenProfileIds";

interface ProfileFilterProps {
  profiles: ProfileWithColor[];
  hiddenIds: Set<number>;
  onChange: (hidden: Set<number>) => void;
}

// Manage the set of hidden profile IDs. On first visit (no localStorage entry)
// we seed it from each profile's `visibleByDefault` flag. Subsequent visits
// use whatever the user last toggled — explicit choice always wins over the
// server-side default.
export function useHiddenProfiles(profiles: ProfileWithColor[]) {
  const [hidden, setHidden] = useState<Set<number>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: number[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHidden(new Set(parsed));
          setHydrated(true);
          return;
        }
      }
    } catch {
      // ignore
    }
    // No saved state — seed from profile defaults.
    setHidden(
      new Set(profiles.filter((p) => !p.visibleByDefault).map((p) => p.id)),
    );
    setHydrated(true);
  }, [profiles]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]));
    } catch {
      // ignore
    }
  }, [hidden, hydrated]);

  return [hidden, setHidden] as const;
}

export function ProfileFilter({ profiles, hiddenIds, onChange }: ProfileFilterProps) {
  if (profiles.length <= 1) return null;
  function toggle(id: number) {
    const next = new Set(hiddenIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-1 border-t border-border bg-background px-2 py-1">
      <span className="hidden text-[10px] uppercase tracking-wide text-muted-foreground sm:inline">
        Show:
      </span>
      {profiles.map((p) => {
        const visible = !hiddenIds.has(p.id);
        const fg = foregroundColor(p.colorValue);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            className="inline-flex items-center justify-center gap-1 rounded-full border border-border px-2 py-px text-[11px] leading-none transition"
            style={{
              background: visible ? p.colorValue : "transparent",
              opacity: visible ? 1 : 0.45,
              color: visible ? fg : "var(--foreground)",
            }}
            title={visible ? `Hide ${p.name}` : `Show ${p.name}`}
          >
            {!visible && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: p.colorValue }}
                aria-hidden="true"
              />
            )}
            <span>{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
