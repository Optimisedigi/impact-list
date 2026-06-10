"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addWeeks, differenceInCalendarDays, format, startOfMonth } from "date-fns";
import { CalendarClock, ExternalLink, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setTimelineVisibility } from "@/server/actions/timeline";
import {
  barGeometry,
  formatDateShort,
  formatTimelineWeekLabel,
  getTimelineWindow,
  resolveTimelineEnd,
  weekIndexFor,
} from "@/lib/time-utils";
import { cn } from "@/lib/utils";
import type { TimelineTask } from "@/server/queries/timeline";

interface TimelineChartProps {
  tasks: TimelineTask[];
  allTasks: TimelineTask[];
  categoryMap: Record<string, { label: string; color: string }>;
  clients: string[];
}

type WindowSize = "3m" | "6m";

const allProjectsValue = "__all__";
const weekWidthPx = 56;
const gutterWidthPx = 288;

const projectColors = [
  "oklch(0.58 0.18 250)",
  "oklch(0.56 0.16 150)",
  "oklch(0.62 0.18 35)",
  "oklch(0.54 0.18 310)",
  "oklch(0.58 0.16 95)",
  "oklch(0.55 0.14 205)",
  "oklch(0.52 0.16 20)",
  "oklch(0.50 0.14 175)",
] as const;

function monthSpans(weeks: Date[]): { label: string; start: number; span: number }[] {
  const spans: { label: string; start: number; span: number }[] = [];
  for (let index = 0; index < weeks.length; index++) {
    const label = format(startOfMonth(weeks[index]), "MMMM yyyy");
    const last = spans[spans.length - 1];
    if (last?.label === label) {
      last.span += 1;
    } else {
      spans.push({ label, start: index, span: 1 });
    }
  }
  return spans;
}

function safeTaskEnd(task: TimelineTask): Date {
  return resolveTimelineEnd(task.timelineStart ?? new Date(), task.timelineEnd);
}

function projectColor(taskId: number): string {
  return projectColors[Math.abs(taskId) % projectColors.length];
}

function daysRemainingLabel(end: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);
  const days = differenceInCalendarDays(endDate, today);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "due today";
  return `${days}d left`;
}

export function TimelineChart({ tasks, allTasks, categoryMap, clients }: TimelineChartProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedClient, setSelectedClient] = useState(allProjectsValue);
  const [windowSize, setWindowSize] = useState<WindowSize>("6m");
  const [taskToAdd, setTaskToAdd] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    if (selectedClient === allProjectsValue) return tasks;
    return tasks.filter((task) => task.client === selectedClient);
  }, [selectedClient, tasks]);

  const maxWeeks = windowSize === "6m" ? 26 : 13;
  const minWeeks = maxWeeks;
  const timelineWindow = useMemo(
    () => getTimelineWindow(
      filteredTasks.map((task) => ({ start: task.timelineStart ?? "", end: task.timelineEnd })),
      { maxWeeks, minWeeks }
    ),
    [filteredTasks, maxWeeks, minWeeks]
  );
  const { startWeek, weeks } = timelineWindow;
  const months = monthSpans(weeks);
  const gridWidth = weeks.length * weekWidthPx;
  const todayIndex = weekIndexFor(new Date(), startWeek);
  const todayLeft = Math.min(Math.max(todayIndex / weeks.length, 0), 1) * 100;
  const todayVisible = todayIndex >= 0 && todayIndex <= weeks.length;

  const hiddenTasks = useMemo(() => {
    const shownIds = new Set(tasks.map((task) => task.id));
    return allTasks
      .filter((task) => !shownIds.has(task.id) && task.status !== "done")
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allTasks, tasks]);

  function addTaskToTimeline(): void {
    const id = Number(taskToAdd);
    if (!Number.isFinite(id)) return;
    setActionError(null);
    startTransition(async () => {
      const result = await setTimelineVisibility(id, true);
      if (result.ok) {
        setTaskToAdd("");
      } else {
        setActionError(result.error);
      }
    });
  }

  function hideTask(taskId: number): void {
    setActionError(null);
    startTransition(async () => {
      const result = await setTimelineVisibility(taskId, false);
      if (!result.ok) setActionError(result.error);
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
        <div className="max-w-md space-y-3">
          <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No timeline projects yet</h2>
          <p className="text-sm text-muted-foreground">
            Add a major task to the timeline and it will get today as its start date. You can then adjust its start and end dates here.
          </p>
          {actionError && <p className="text-xs text-destructive">{actionError}</p>}
          <div className="flex justify-center gap-2">
            <Select value={taskToAdd} onValueChange={setTaskToAdd}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Add a project" />
              </SelectTrigger>
              <SelectContent>
                {hiddenTasks.length === 0 ? (
                  <SelectItem value="none" disabled>No available tasks</SelectItem>
                ) : hiddenTasks.map((task) => (
                  <SelectItem key={task.id} value={String(task.id)}>{task.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" disabled={!taskToAdd || isPending} onClick={addTaskToTimeline}>Add</Button>
          </div>
          <Button variant="ghost" onClick={() => router.push("/tasks")}>Go to tasks</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allProjectsValue}>All projects</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client} value={client}>{client}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Select value={taskToAdd} onValueChange={setTaskToAdd}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Add a project" />
              </SelectTrigger>
              <SelectContent>
                {hiddenTasks.length === 0 ? (
                  <SelectItem value="none" disabled>No available tasks</SelectItem>
                ) : hiddenTasks.map((task) => (
                  <SelectItem key={task.id} value={String(task.id)}>{task.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" disabled={!taskToAdd || isPending} onClick={addTaskToTimeline}>
              Add
            </Button>
          </div>
          <div className="flex rounded-md border p-0.5">
            {(["3m", "6m"] as const).map((size) => (
              <Button
                key={size}
                type="button"
                variant={windowSize === size ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setWindowSize(size)}
              >
                {size === "3m" ? "3 months" : "6 months"}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-sm text-muted-foreground">
            {filteredTasks.length} project{filteredTasks.length === 1 ? "" : "s"} · {format(startWeek, "d MMM")} – {format(addWeeks(startWeek, weeks.length), "d MMM yyyy")}
          </p>
          {actionError && <p className="text-xs text-destructive">{actionError}</p>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div style={{ minWidth: gutterWidthPx + gridWidth }}>
          <div className="sticky top-0 z-20 grid border-b bg-card" style={{ gridTemplateColumns: `${gutterWidthPx}px ${gridWidth}px` }}>
            <div className="sticky left-0 z-30 border-r bg-card p-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Project
            </div>
            <div className="relative bg-card">
              <div className="grid border-b text-xs font-medium text-muted-foreground" style={{ gridTemplateColumns: `repeat(${weeks.length}, ${weekWidthPx}px)` }}>
                {months.map((month) => (
                  <div
                    key={`${month.label}-${month.start}`}
                    className="border-r px-2 py-1"
                    style={{ gridColumn: `${month.start + 1} / span ${month.span}` }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
              <div className="grid text-xs text-muted-foreground" style={{ gridTemplateColumns: `repeat(${weeks.length}, ${weekWidthPx}px)` }}>
                {weeks.map((week) => (
                  <div key={week.toISOString()} className="border-r px-2 py-2">
                    {formatTimelineWeekLabel(week)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            {todayVisible && (
              <div className="pointer-events-none absolute bottom-0 top-0 z-10" style={{ left: gutterWidthPx + (todayLeft / 100) * gridWidth }}>
                <div className="h-full w-px bg-destructive" />
                <div className="absolute -top-6 -translate-x-1/2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-medium text-destructive-foreground">
                  Today
                </div>
              </div>
            )}

            {filteredTasks.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No projects match this filter.
              </div>
            ) : filteredTasks.map((task) => {
              const category = categoryMap[task.category] ?? { label: task.category, color: "oklch(0.55 0.03 260)" };
              const start = task.timelineStart ?? new Date();
              const end = safeTaskEnd(task);
              const geometry = barGeometry(start, task.timelineEnd, startWeek, weeks.length);
              const remaining = daysRemainingLabel(end);
              return (
                <div
                  key={task.id}
                  className="grid min-h-16 border-b hover:bg-muted/40"
                  style={{ gridTemplateColumns: `${gutterWidthPx}px ${gridWidth}px` }}
                >
                  <div className="sticky left-0 z-10 flex min-w-0 items-center justify-between gap-2 border-r bg-card px-3 text-left hover:bg-muted">
                    <span className="min-w-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        className="block max-w-full truncate text-sm font-medium hover:underline"
                      >
                        {task.title}
                      </button>
                      <span className="block truncate text-xs text-muted-foreground">
                        {task.client || "No client"} · {category.label}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push(`/tasks/${task.id}`)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label={`Open ${task.title}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="relative" style={{ backgroundImage: "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: `${weekWidthPx}px 100%` }}>
                    <button
                      type="button"
                      onClick={() => router.push(`/tasks/${task.id}`)}
                      title={`${task.title}: ${formatDateShort(task.timelineStart)} – ${formatDateShort(end.toISOString())} · ${remaining}`}
                      className={cn(
                        "absolute top-1/2 h-8 -translate-y-1/2 rounded-full px-3 text-left text-xs font-medium text-white shadow-sm transition hover:brightness-110",
                        task.status === "done" && "opacity-55"
                      )}
                      style={{
                        left: `${geometry.leftPct}%`,
                        width: `${Math.max(geometry.widthPct, 1.5)}%`,
                        backgroundColor: projectColor(task.id),
                      }}
                    >
                      <span className="block truncate text-center">{remaining}</span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={isPending}
                      onClick={() => hideTask(task.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/80"
                      title="Remove from timeline"
                    >
                      <EyeOff className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
