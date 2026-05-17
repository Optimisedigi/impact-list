"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProfileWithColor } from "@/server/queries/calendar-profiles";
import { foregroundColor } from "@/lib/calendar/contrast";

const STORAGE_KEY = "calendar.filterOverrides";

interface ProfileFilterProps {
  profiles: ProfileWithColor[];
  hiddenIds: Set<number>;
  onToggle: (profileId: number) => void;
}

interface Overrides {
  // Profile IDs the user explicitly shows (overrides "hide by default").
  forceShow: number[];
  // Profile IDs the user explicitly hides (overrides "show by default").
  forceHide: number[];
}

const EMPTY: Overrides = { forceShow: [], forceHide: [] };

// Compute the effective `hiddenIds` set from server-side defaults + user
// overrides. Server defaults from `visibleByDefault` flow through unless the
// user has explicitly toggled that profile.
export function useHiddenProfiles(profiles: ProfileWithColor[]) {
  const [overrides, setOverrides] = useState<Overrides>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Overrides>;
        setOverrides({
          forceShow: Array.isArray(parsed.forceShow) ? parsed.forceShow : [],
          forceHide: Array.isArray(parsed.forceHide) ? parsed.forceHide : [],
        });
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist overrides whenever they change.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch {
      // ignore
    }
  }, [overrides, hydrated]);

  const hiddenIds = useMemo(() => {
    const force = new Set(overrides.forceHide);
    const show = new Set(overrides.forceShow);
    const result = new Set<number>();
    for (const p of profiles) {
      if (show.has(p.id)) continue; // user wants it shown
      if (force.has(p.id) || !p.visibleByDefault) result.add(p.id);
    }
    return result;
  }, [profiles, overrides]);

  function toggle(profileId: number) {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    const isHidden = hiddenIds.has(profileId);
    // Toggling means: flip the effective visibility. If the result agrees
    // with the server-side default, clear the override. Otherwise set it.
    const wantVisible = isHidden;
    const matchesDefault = wantVisible === profile.visibleByDefault;

    setOverrides((prev) => {
      const forceShow = new Set(prev.forceShow);
      const forceHide = new Set(prev.forceHide);
      forceShow.delete(profileId);
      forceHide.delete(profileId);
      if (!matchesDefault) {
        if (wantVisible) forceShow.add(profileId);
        else forceHide.add(profileId);
      }
      return {
        forceShow: [...forceShow],
        forceHide: [...forceHide],
      };
    });
  }

  return [hiddenIds, toggle] as const;
}

export function ProfileFilter({ profiles, hiddenIds, onToggle }: ProfileFilterProps) {
  if (profiles.length <= 1) return null;
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
            onClick={() => onToggle(p.id)}
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
