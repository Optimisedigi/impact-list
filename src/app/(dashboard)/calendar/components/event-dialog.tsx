"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EVENT_COLORS } from "@/lib/constants";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvent,
  updateCalendarEvent,
} from "@/server/actions/calendar-events";
import type { CalendarEvent } from "@/types";
import type { ResolvedColor } from "@/server/queries/calendar-color-labels";
import type { CalendarTarget } from "@/server/queries/calendar-targets";
import type { ProfileWithColor } from "@/server/queries/calendar-profiles";
import { foregroundColor } from "@/lib/calendar/contrast";
import { cn } from "@/lib/utils";

export type EventDialogState =
  | { open: false }
  | { open: true; mode: "create"; initialDate?: string }
  | { open: true; mode: "edit"; eventId: number };

interface EventDialogProps {
  state: EventDialogState;
  resolvedColors: ResolvedColor[];
  targets: CalendarTarget[];
  profiles: ProfileWithColor[];
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  color: string;
  profileId: number | null;
}

function emptyForm(initialDate?: string): FormState {
  const d = initialDate ?? new Date().toISOString().slice(0, 10);
  return {
    title: "",
    description: "",
    location: "",
    startDate: d,
    endDate: d,
    allDay: true,
    startTime: "09:00",
    endTime: "10:00",
    color: EVENT_COLORS[0].key,
    profileId: null,
  };
}

// Collapse a target's account label + calendar name when they're identical.
function dedupeTargetLabel(t: CalendarTarget): string {
  const parts = [t.calendarName, t.accountLabel]
    .map((p) => p.trim())
    .filter(Boolean);
  return [...new Set(parts)].join(" — ");
}

function targetDropdownLabel(t: CalendarTarget): string {
  return `${dedupeTargetLabel(t)} (${t.provider})`;
}

// Friendly one-line label describing where this event came from. Shown under
// the dialog title in edit mode so the user knows whether they're looking at
// a local entry, a Google Calendar event, or an Apple/iCloud calendar event.
function provenanceLabel(
  source: CalendarEvent["source"] | undefined,
  boundTarget: CalendarTarget | null,
): string {
  if (!source) return "";
  if (boundTarget) {
    const provider =
      boundTarget.provider === "google" ? "Google Calendar" : "Apple Calendar";
    // Account label and calendar name are often the same (Google's primary
    // calendar is named after the account). Collapse duplicates.
    const parts = [boundTarget.calendarName, boundTarget.accountLabel]
      .map((p) => p.trim())
      .filter(Boolean);
    const label = [...new Set(parts)].join(" — ");
    return `From ${provider}${label ? ` — ${label}` : ""}`;
  }
  if (source === "google") return "From Google Calendar (calendar no longer connected)";
  if (source === "apple") return "From Apple Calendar (calendar no longer connected)";
  return "Manually added in Impact List";
}

function fromEvent(ev: CalendarEvent): FormState {
  const start = ev.startsAt;
  const end = ev.endsAt;
  if (ev.allDay) {
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() - 1);
    return {
      title: ev.title,
      description: ev.description ?? "",
      location: ev.location ?? "",
      startDate: start.slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      allDay: true,
      startTime: "09:00",
      endTime: "10:00",
      color: ev.color ?? EVENT_COLORS[0].key,
      profileId: ev.profileId ?? null,
    };
  }
  return {
    title: ev.title,
    description: ev.description ?? "",
    location: ev.location ?? "",
    startDate: start.slice(0, 10),
    endDate: end.slice(0, 10),
    allDay: false,
    startTime: start.slice(11, 16) || "09:00",
    endTime: end.slice(11, 16) || "10:00",
    color: ev.color ?? EVENT_COLORS[0].key,
    profileId: ev.profileId ?? null,
  };
}

function toPayload(form: FormState) {
  if (form.allDay) {
    const exclusiveEnd = new Date(form.endDate);
    exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
    return {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      startsAt: form.startDate,
      endsAt: exclusiveEnd.toISOString().slice(0, 10),
      allDay: true,
      color: form.color,
      profileId: form.profileId,
    };
  }
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    location: form.location.trim() || null,
    startsAt: `${form.startDate}T${form.startTime}:00`,
    endsAt: `${form.endDate}T${form.endTime}:00`,
    allDay: false,
    color: form.color,
    profileId: form.profileId,
  };
}

export function EventDialog({
  state,
  resolvedColors,
  targets,
  profiles,
  onOpenChange,
}: EventDialogProps) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-2 sm:max-w-xl">
        {/* Always-present accessibility title. The visible heading inside the
            body replaces this once the body mounts. */}
        <DialogTitle className="sr-only">Event</DialogTitle>
        {state.open && (
          <div className="min-w-0 flex-1 overflow-y-auto pr-1">
            <EventDialogBody
              state={state}
              resolvedColors={resolvedColors}
              targets={targets}
              profiles={profiles}
              onClose={() => onOpenChange(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface EventDialogBodyProps {
  state: Extract<EventDialogState, { open: true }>;
  resolvedColors: ResolvedColor[];
  targets: CalendarTarget[];
  profiles: ProfileWithColor[];
  onClose: () => void;
}

function EventDialogBody({
  state,
  resolvedColors,
  targets,
  profiles,
  onClose,
}: EventDialogBodyProps) {
  if (state.mode === "create") {
    return (
      <EventForm
        initial={emptyForm(state.initialDate)}
        mode="create"
        resolvedColors={resolvedColors}
        targets={targets}
        profiles={profiles}
        initialTargetId={null}
        onClose={onClose}
      />
    );
  }
  return (
    <EditEventBody
      eventId={state.eventId}
      resolvedColors={resolvedColors}
      targets={targets}
      profiles={profiles}
      onClose={onClose}
    />
  );
}

// Fetch the event after mount to avoid kicking off a server action during
// render (which would cause cross-component setState warnings).
function EditEventBody({
  eventId,
  resolvedColors,
  targets,
  profiles,
  onClose,
}: {
  eventId: number;
  resolvedColors: ResolvedColor[];
  targets: CalendarTarget[];
  profiles: ProfileWithColor[];
  onClose: () => void;
}) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; event: CalendarEvent }
    | { kind: "missing" }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    fetchCalendarEvent(eventId).then((ev) => {
      if (cancelled) return;
      setState(ev ? { kind: "ready", event: ev } : { kind: "missing" });
    });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (state.kind === "loading") {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (state.kind === "missing") {
    return <p className="text-sm text-muted-foreground">Event not found.</p>;
  }
  // Preselect the target if the event is already bound to a remote calendar.
  const boundTarget = targets.find(
    (t) => t.externalCalendarId === state.event.externalCalendarId,
  );
  const initialTargetId = boundTarget?.subscriptionId ?? null;

  return (
    <EventForm
      initial={fromEvent(state.event)}
      mode="edit"
      eventId={eventId}
      resolvedColors={resolvedColors}
      targets={targets}
      profiles={profiles}
      initialTargetId={initialTargetId}
      boundTarget={boundTarget ?? null}
      source={state.event.source}
      onClose={onClose}
    />
  );
}

interface EventFormProps {
  initial: FormState;
  mode: "create" | "edit";
  eventId?: number;
  resolvedColors: ResolvedColor[];
  targets: CalendarTarget[];
  profiles: ProfileWithColor[];
  initialTargetId: number | null;
  // When set, the event is bound to a remote calendar whose profile dictates
  // the color. The picker is then disabled with a hint pointing to Settings.
  boundTarget?: CalendarTarget | null;
  // Source of the event ("local" / "google" / "apple"). Used to show a
  // provenance label so the user knows where this event came from.
  source?: CalendarEvent["source"];
  onClose: () => void;
}

function EventForm({
  initial,
  mode,
  eventId,
  resolvedColors,
  targets,
  profiles,
  initialTargetId,
  boundTarget = null,
  source,
  onClose,
}: EventFormProps) {
  const [form, setForm] = useState<FormState>(initial);
  // Selected calendar target: null = local-only, otherwise a subscription id.
  const [targetId, setTargetId] = useState<number | null>(initialTargetId);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = toPayload(form);
    if (!payload.title) return;
    const target = targetId ?? undefined;
    startTransition(async () => {
      if (mode === "create") {
        await createCalendarEvent(payload, target);
      } else if (eventId !== undefined) {
        await updateCalendarEvent(eventId, payload, target);
      }
      onClose();
    });
  }

  function handleDelete() {
    if (eventId === undefined) return;
    startTransition(async () => {
      await deleteCalendarEvent(eventId);
      onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit event" : "New event"}</DialogTitle>
        {mode === "edit" && (
          <p className="text-xs text-muted-foreground">{provenanceLabel(source, boundTarget)}</p>
        )}
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3">
        {targets.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="ev-target">Calendar</Label>
            <select
              id="ev-target"
              value={targetId === null ? "" : String(targetId)}
              onChange={(e) =>
                setTargetId(
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Local only (don’t sync to a calendar)</option>
              {targets.map((t) => (
                <option key={t.subscriptionId} value={t.subscriptionId}>
                  {targetDropdownLabel(t)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="ev-title">Title</Label>
          <Input
            id="ev-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            autoFocus
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="ev-allday"
            type="checkbox"
            checked={form.allDay}
            onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
          />
          <Label htmlFor="ev-allday">All day</Label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="ev-start">Start</Label>
            <Input
              id="ev-start"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
            {!form.allDay && (
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ev-end">End</Label>
            <Input
              id="ev-end"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
            {!form.allDay && (
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ev-location">Location</Label>
          <Input
            id="ev-location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ev-description">Description</Label>
          <Textarea
            id="ev-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </div>
        <div className="space-y-1">
          <Label>Profile</Label>
          <div className="flex flex-wrap gap-1.5">
            {profiles.map((p) => {
              const selected = form.profileId === p.id;
              const fg = foregroundColor(p.colorValue);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setForm({ ...form, profileId: p.id })}
                  className={cn(
                    "flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs transition",
                    selected
                      ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                      : "hover:bg-accent",
                  )}
                  style={
                    selected
                      ? { background: p.colorValue, color: fg }
                      : undefined
                  }
                  title={p.name}
                >
                  <span
                    className="h-4 w-4 rounded-sm"
                    style={{ background: p.colorValue }}
                    aria-hidden="true"
                  />
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
          {boundTarget && (
            <p className="text-xs text-muted-foreground">
              {form.profileId === null ? (
                <>
                  Inherits color from{" "}
                  <span className="font-medium text-foreground">
                    {dedupeTargetLabel(boundTarget)}
                  </span>
                  . Pick a profile above to override this event only.
                </>
              ) : (
                <>
                  Overrides{" "}
                  <span className="font-medium text-foreground">
                    {dedupeTargetLabel(boundTarget)}
                  </span>
                  .{" "}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, profileId: null })}
                    className="underline hover:text-foreground"
                  >
                    Reset to calendar default
                  </button>
                </>
              )}
            </p>
          )}
        </div>
        <DialogFooter className="pt-2">
          {mode === "edit" && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="sm:mr-auto"
            >
              Delete
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !form.title.trim()}>
            Save
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
