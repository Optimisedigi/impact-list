"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createProfile,
  deleteProfile,
  setDefaultProfile,
  updateProfile,
} from "@/server/actions/calendar-profiles";
import type { ProfileWithColor } from "@/server/queries/calendar-profiles";
import type { ResolvedColor } from "@/server/queries/calendar-color-labels";
import { useRouter } from "next/navigation";

interface Props {
  profiles: ProfileWithColor[];
  resolvedColors: ResolvedColor[];
}

export function CalendarProfilesManager({ profiles, resolvedColors }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(resolvedColors[0]?.key ?? "gray");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    startTransition(async () => {
      await createProfile(newName.trim(), newColor);
      setNewName("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleCreate}
        className="space-y-2 rounded-md border border-border bg-card p-4"
      >
        <h3 className="font-semibold">Add a profile</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Work"
              className="w-48"
            />
          </div>
          <div className="space-y-1">
            <Label>Color</Label>
            <ColorPicker
              colors={resolvedColors}
              value={newColor}
              onChange={setNewColor}
            />
          </div>
          <Button type="submit" disabled={isPending || !newName.trim()}>
            Add
          </Button>
        </div>
      </form>

      <ul className="space-y-2">
        {profiles.map((p) => (
          <ProfileRow
            key={p.id}
            profile={p}
            resolvedColors={resolvedColors}
            isPending={isPending}
            onAfter={() => router.refresh()}
            startTransition={startTransition}
          />
        ))}
      </ul>
    </div>
  );
}

function ProfileRow({
  profile,
  resolvedColors,
  isPending,
  onAfter,
  startTransition,
}: {
  profile: ProfileWithColor;
  resolvedColors: ResolvedColor[];
  isPending: boolean;
  onAfter: () => void;
  startTransition: React.TransitionStartFunction;
}) {
  const [name, setName] = useState(profile.name);
  const [colorKey, setColorKey] = useState(profile.colorKey);
  const [visibleByDefault, setVisibleByDefault] = useState(
    profile.visibleByDefault,
  );
  const [kind, setKind] = useState<"personal" | "business" | "">(
    (profile.kind as "personal" | "business" | null) ?? "",
  );

  function save() {
    startTransition(async () => {
      await updateProfile(profile.id, {
        name,
        colorKey,
        visibleByDefault,
        kind: kind === "" ? null : kind,
      });
      onAfter();
    });
  }

  function makeDefault() {
    startTransition(async () => {
      await setDefaultProfile(profile.id);
      onAfter();
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteProfile(profile.id);
      onAfter();
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3">
      <span
        className="h-6 w-6 shrink-0 rounded-md border border-border"
        style={{ background: profile.colorValue }}
        aria-hidden="true"
      />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-32"
      />
      <ColorPicker
        colors={resolvedColors}
        value={colorKey}
        onChange={setColorKey}
      />
      <label
        className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
        title="When on, events from this profile show on the calendar by default. When off, the profile is hidden until you toggle it via the filter chips."
      >
        <input
          type="checkbox"
          checked={visibleByDefault}
          onChange={(e) => setVisibleByDefault(e.target.checked)}
        />
        Show by default
      </label>
      <select
        value={kind}
        onChange={(e) =>
          setKind(e.target.value as "personal" | "business" | "")
        }
        className="h-7 rounded-md border border-input bg-background px-2 text-xs"
        title="Used by the external Morning Routine API to bucket events as personal or business."
      >
        <option value="">— Kind —</option>
        <option value="personal">Personal</option>
        <option value="business">Business</option>
      </select>
      <Button
        size="sm"
        onClick={save}
        disabled={isPending}
        className="h-7 px-2 text-[11px]"
      >
        Save
      </Button>
      <Button
        size="sm"
        variant={profile.isDefault ? "secondary" : "outline"}
        onClick={makeDefault}
        disabled={isPending || profile.isDefault}
        className="h-7 px-2 text-[11px]"
      >
        {profile.isDefault ? "Default" : "Make default"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={remove}
        disabled={isPending || profile.isDefault}
        title={
          profile.isDefault
            ? "Pick a different default before deleting this one"
            : "Delete profile"
        }
        className="h-7 px-2 text-[11px]"
      >
        Delete
      </Button>
    </li>
  );
}

function ColorPicker({
  colors,
  value,
  onChange,
}: {
  colors: ResolvedColor[];
  value: string;
  onChange: (key: string) => void;
}) {
  // A palette key (e.g. "blue") OR a raw color string (hex / oklch). The
  // native <input type="color"> emits hex, which we store directly.
  const isPaletteKey = colors.some((c) => c.key === value);
  const customValue = isPaletteKey ? "#7da3c2" : value;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {colors.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          className={cn(
            "h-5 w-5 rounded-md border border-border transition",
            value === c.key
              ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
              : "",
          )}
          style={{ background: c.color }}
          title={c.label}
          aria-label={c.label}
        />
      ))}
      {/* Custom color swatch — click to open the native picker. The swatch
          itself shows the current custom color (if any). */}
      <label
        className={cn(
          "relative h-5 w-5 cursor-pointer rounded-md border border-border bg-[conic-gradient(from_0deg,#f87171,#fbbf24,#34d399,#60a5fa,#a78bfa,#f87171)] transition",
          !isPaletteKey
            ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
            : "",
        )}
        title="Custom color"
        aria-label="Pick a custom color"
      >
        {!isPaletteKey && (
          <span
            className="absolute inset-0.5 rounded-[3px]"
            style={{ background: value }}
            aria-hidden="true"
          />
        )}
        <input
          type="color"
          value={customValue}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
