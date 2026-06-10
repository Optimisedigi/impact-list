"use client";

import { useState, useOptimistic, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateTaskField } from "@/server/actions/tasks";
import { setTimelineVisibility, updateTimelineDates } from "@/server/actions/timeline";
import { quickLogHours } from "@/server/actions/time-entries";
import { STATUS_OPTIONS, TO_COMPLETE_OPTIONS } from "@/lib/constants";
import { CategoryBadge, StatusBadge, LeverageBadge } from "../../components/priority-badge";
import { daysLeft, todayLocalISO } from "@/lib/time-utils";
import type { Task } from "@/types";
import type { CategoryOption } from "@/lib/constants";
import type { TimelineTask } from "@/server/queries/timeline";

export function TaskMetadataSidebar({
  task,
  clientOptions,
  categoryMap,
  categoryOptions,
  timelineFields,
}: {
  task: Task;
  clientOptions: string[];
  categoryMap: Record<string, { label: string; color: string }>;
  categoryOptions: CategoryOption[];
  timelineFields: Pick<TimelineTask, "timelineStart" | "timelineEnd" | "showOnTimeline">;
}) {
  const [isPending, startTransition] = useTransition();
  const [markingDone, setMarkingDone] = useState(false);
  const [hoursInput, setHoursInput] = useState("");
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState(timelineFields);
  const [optimistic, setOptimistic] = useOptimistic(
    task,
    (current: Task, update: Partial<Task>) => ({ ...current, ...update })
  );

  function saveField(field: string, value: string | number | null) {
    if (field === "status" && value === "done") {
      setHoursInput("");
      setMarkingDone(true);
      return;
    }
    startTransition(async () => {
      setOptimistic({ [field]: value } as Partial<Task>);
      await updateTaskField(task.id, field, value);
    });
  }

  function confirmMarkDone() {
    startTransition(async () => {
      setOptimistic({ status: "done" } as Partial<Task>);
      const hours = parseFloat(hoursInput);
      if (!isNaN(hours) && hours > 0) {
        await quickLogHours(task.id, hours, todayLocalISO());
      }
      await updateTaskField(task.id, "status", "done");
      setMarkingDone(false);
    });
  }

  function toggleTimeline(show: boolean) {
    setTimelineError(null);
    const nextStart = show && !timeline.timelineStart ? todayLocalISO() : timeline.timelineStart;
    setTimeline((current) => ({ ...current, showOnTimeline: show, timelineStart: nextStart }));
    startTransition(async () => {
      const result = await setTimelineVisibility(task.id, show);
      if (!result.ok) {
        setTimeline(timeline);
        setTimelineError(result.error);
      }
    });
  }

  function saveTimelineDates(start: string | null, end: string | null) {
    setTimelineError(null);
    setTimeline((current) => ({ ...current, timelineStart: start, timelineEnd: end }));
    startTransition(async () => {
      const result = await updateTimelineDates(task.id, start, end);
      if (!result.ok) {
        setTimeline(timeline);
        setTimelineError(result.error);
      }
    });
  }

  const days = daysLeft(optimistic.deadline);

  return (
    <div
      className={`rounded-lg border bg-card p-4 space-y-4 ${isPending ? "opacity-60" : ""}`}
    >
      <h2 className="text-sm font-medium">Details</h2>

      <Field label="Status">
        {markingDone ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Hours spent:</label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-16 rounded border border-border bg-background px-1.5 py-0.5 text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmMarkDone();
                  if (e.key === "Escape") setMarkingDone(false);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="default" className="h-6 px-2 text-xs" onClick={confirmMarkDone} disabled={isPending}>
                Mark Done
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setMarkingDone(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Select
            value={optimistic.status}
            onValueChange={(v) => saveField("status", v)}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <StatusBadge status={s.value} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <Field label="Category">
        <Select
          value={optimistic.category}
          onValueChange={(v) => saveField("category", v)}
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <CategoryBadge category={c.value} categoryMap={categoryMap} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="To Complete">
        <Select
          value={optimistic.toComplete ?? "__none__"}
          onValueChange={(v) =>
            saveField("toComplete", v === "__none__" ? null : v)
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">--</SelectItem>
            {TO_COMPLETE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Client">
        <Select
          value={optimistic.client ?? "__none__"}
          onValueChange={(v) =>
            saveField("client", v === "__none__" ? null : v)
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {clientOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Deadline">
        <Input
          type="date"
          value={optimistic.deadline ?? ""}
          onChange={(e) => saveField("deadline", e.target.value || null)}
          className="h-8"
        />
        {days !== null && (
          <span
            className={`text-xs ${days < 0 ? "text-red-400" : "text-muted-foreground"}`}
          >
            {days < 0
              ? `${Math.abs(days)}d overdue`
              : `${days}d left`}
          </span>
        )}
      </Field>

      <Field label="Timeline">
        <div className="space-y-2">
          <Button
            type="button"
            size="sm"
            variant={timeline.showOnTimeline ? "secondary" : "outline"}
            className="h-8 w-full"
            disabled={isPending}
            onClick={() => toggleTimeline(!timeline.showOnTimeline)}
          >
            {timeline.showOnTimeline ? "Remove from timeline" : "Add to timeline"}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={timeline.timelineStart ?? ""}
              disabled={isPending}
              onChange={(event) => saveTimelineDates(event.target.value || null, timeline.timelineEnd)}
              className="h-8"
              aria-label="Timeline start"
            />
            <Input
              type="date"
              value={timeline.timelineEnd ?? ""}
              disabled={isPending}
              onChange={(event) => saveTimelineDates(timeline.timelineStart, event.target.value || null)}
              className="h-8"
              aria-label="Timeline end"
            />
          </div>
          {timelineError && <p className="text-xs text-destructive">{timelineError}</p>}
        </div>
      </Field>

      <Field label="Estimated Hours">
        <Input
          type="number"
          step="0.25"
          value={optimistic.estimatedHours ?? ""}
          onChange={(e) =>
            saveField(
              "estimatedHours",
              e.target.value ? Number(e.target.value) : null
            )
          }
          onBlur={(e) =>
            saveField(
              "estimatedHours",
              e.target.value ? Number(e.target.value) : null
            )
          }
          className="h-8"
        />
      </Field>

      <Field label="Actual Hours">
        <span className="text-sm">{optimistic.actualHours ?? 0}h</span>
      </Field>

      <Field label="Leverage">
        <LeverageBadge score={optimistic.leverageScore} />
      </Field>

      <Field label="Priority Score">
        <span className="text-sm">
          {optimistic.priorityScore ?? (
            <span className="text-muted-foreground">--</span>
          )}
        </span>
      </Field>

      {optimistic.sequenceReason && (
        <Field label="Sequence Reason">
          <p className="text-xs text-muted-foreground">
            {optimistic.sequenceReason}
          </p>
        </Field>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
