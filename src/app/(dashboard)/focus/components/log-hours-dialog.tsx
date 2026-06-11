"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Plus, Trash2 } from "lucide-react";
import { quickLogHours } from "@/server/actions/time-entries";
import { useTaskTimer } from "@/components/timer/task-timer-context";
import { todayLocalISO } from "@/lib/time-utils";
import type { Task } from "@/types";

type EntryMode = "hours" | "sections";

type WorkSection = {
  id: string;
  start: string;
  end: string;
};

const defaultSectionCount = 3;

const emptyWorkSection = (id: string): WorkSection => ({ id, start: "", end: "" });

function createEmptySections(count: number): WorkSection[] {
  return Array.from({ length: count }, (_, index) => emptyWorkSection(`section-${index + 1}`));
}

function timeToMinutes(value: string): number | null {
  const [hourPart, minutePart] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
}

function calculateSectionHours(sections: readonly WorkSection[]): number {
  const totalMinutes = sections.reduce((total, section) => {
    const start = timeToMinutes(section.start);
    const end = timeToMinutes(section.end);

    if (start == null || end == null) return total;

    if (end === start) return total;

    const duration = end > start ? end - start : end + 24 * 60 - start;
    return total + duration;
  }, 0);

  return Math.round((totalMinutes / 60) * 100) / 100;
}

function formatHours(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

interface LogHoursDialogProps {
  task: Task;
  variant?: "icon" | "button";
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  defaultMode?: EntryMode;
}

export function LogHoursDialog({
  task,
  variant = "icon",
  className = "",
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  defaultMode = "sections",
}: LogHoursDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [entryMode, setEntryMode] = useState<EntryMode>(defaultMode);
  const [sections, setSections] = useState<WorkSection[]>(createEmptySections(defaultSectionCount));
  const [nextSectionId, setNextSectionId] = useState(defaultSectionCount + 1);
  const [isPending, startTransition] = useTransition();
  const { finishTimer, hasTimer, getAllocatedSeconds } = useTaskTimer();
  const open = controlledOpen ?? internalOpen;

  const sectionHours = calculateSectionHours(sections);
  const parsedHours = parseFloat(hours);
  const hoursToLog = entryMode === "sections" ? sectionHours : parsedHours;
  const canLog = Number.isFinite(hoursToLog) && hoursToLog > 0;

  function setOpen(openState: boolean) {
    if (onOpenChange) {
      onOpenChange(openState);
      return;
    }
    setInternalOpen(openState);
  }

  function handleOpenChange(o: boolean) {
    if (o) {
      const hasActiveTimer = hasTimer(task.id);
      setEntryMode(hasActiveTimer ? "hours" : defaultMode);
      setSections(createEmptySections(defaultSectionCount));
      setNextSectionId(defaultSectionCount + 1);
      // Pre-fill with timer hours if running on this task
      if (hasActiveTimer) {
        const secs = getAllocatedSeconds(task.id);
        const h = Math.round((secs / 3600) * 100) / 100;
        setHours(h > 0 ? String(h) : "");
      } else {
        setHours("");
      }
    }
    setOpen(o);
  }

  function updateSection(id: string, field: "start" | "end", value: string) {
    setSections((currentSections) =>
      currentSections.map((section) => (section.id === id ? { ...section, [field]: value } : section)),
    );
  }

  function addSection() {
    setSections((currentSections) => [...currentSections, emptyWorkSection(`section-${nextSectionId}`)]);
    setNextSectionId((currentId) => currentId + 1);
  }

  function removeSection(id: string) {
    setSections((currentSections) => {
      if (currentSections.length === 1) return currentSections;
      return currentSections.filter((section) => section.id !== id);
    });
  }

  function handleLog() {
    if (!canLog) return;
    startTransition(async () => {
      // Stop timer if running and log its accumulated time too
      if (hasTimer(task.id)) {
        finishTimer(task.id);
      }
      await quickLogHours(task.id, hoursToLog, todayLocalISO());
      setOpen(false);
      setHours("");
      setSections(createEmptySections(defaultSectionCount));
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {variant === "button" ? (
            <Button variant="outline" size="sm" className={className}>
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Log Hours
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={`h-5 w-5 text-muted-foreground hover:text-primary ${className}`}
              title="Log hours"
            >
              <Clock className="h-3 w-3" />
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Log Hours</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground truncate">
            {task.title}
          </p>
          {task.actualHours != null && task.actualHours > 0 && (
            <p className="text-xs text-muted-foreground">
              Currently logged: <span className="font-medium text-foreground">{task.actualHours}h</span>
            </p>
          )}

          <div className="grid grid-cols-2 rounded-lg border border-border bg-muted/30 p-1 text-sm">
            <button
              type="button"
              onClick={() => setEntryMode("hours")}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                entryMode === "hours" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Enter total
            </button>
            <button
              type="button"
              onClick={() => setEntryMode("sections")}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                entryMode === "sections" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Start/end times
            </button>
          </div>

          {entryMode === "hours" ? (
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Hours:</label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                autoFocus
                className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLog();
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <div key={section.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                    <input
                      type="time"
                      value={section.start}
                      onChange={(e) => updateSection(section.id, "start", e.target.value)}
                      aria-label={`Work section ${index + 1} start time`}
                      className="min-w-0 rounded border border-border bg-background px-2 py-2 text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={section.end}
                      onChange={(e) => updateSection(section.id, "end", e.target.value)}
                      aria-label={`Work section ${index + 1} end time`}
                      className="min-w-0 rounded border border-border bg-background px-2 py-2 text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSection(section.id)}
                      disabled={sections.length === 1}
                      className="h-8 w-8 text-muted-foreground"
                      title="Remove section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="outline" size="sm" onClick={addSection}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add section
                </Button>
                <p className="text-sm text-muted-foreground">
                  Total: <span className="font-medium text-foreground">{formatHours(sectionHours)}h</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter each work block separately, e.g. 09:00–12:00, 13:00–18:00, 20:00–22:00.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleLog} disabled={isPending || !canLog}>
              Log {canLog ? `${formatHours(hoursToLog)}h` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
