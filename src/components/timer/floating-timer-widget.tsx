"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useTaskTimer } from "./task-timer-context";
import { quickLogHours } from "@/server/actions/time-entries";
import { updateTaskField } from "@/server/actions/tasks";
import { Play, CheckCircle, Timer, Pause, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function formatHours(hours: number): string {
  if (hours < 0.01) return "0m";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function TimerRow({ taskId, taskTitle, paused }: { taskId: number; taskTitle: string; paused: boolean }) {
  const { pauseTimer, startTimer, finishTimer, getAllocatedSeconds } = useTaskTimer();
  const [isPending, startTransition] = useTransition();
  const [confirmDone, setConfirmDone] = useState(false);

  const allocated = getAllocatedSeconds(taskId);

  function handlePause() {
    pauseTimer(taskId);
  }

  function handleResume() {
    startTimer(taskId, taskTitle);
  }

  function handleDone() {
    const hours = finishTimer(taskId);
    const roundedHours = Math.round(hours * 100) / 100;
    startTransition(async () => {
      if (roundedHours > 0) {
        await quickLogHours(taskId, roundedHours);
      }
      await updateTaskField(taskId, "status", "done");
      setConfirmDone(false);
    });
  }

  if (confirmDone) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{taskTitle}</p>
          <p className="text-xs text-muted-foreground">
            Log {formatHours(allocated / 3600)} and mark done?
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="default"
            className="h-6 px-2 text-xs"
            onClick={handleDone}
            disabled={isPending}
          >
            Yes
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => setConfirmDone(false)}
          >
            No
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{taskTitle}</p>
        <div className="flex items-center gap-3 text-xs">
          <span className={`font-mono text-base tabular-nums ${paused ? "text-yellow-400" : "text-green-400"}`}>
            {formatTime(allocated)}
          </span>
          <span className="text-gray-400">
            {paused ? "paused" : `allocated: ${formatHours(allocated / 3600)}`}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        {paused ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/20 shrink-0"
            onClick={handleResume}
            title="Resume timer"
          >
            <Play className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20 shrink-0"
            onClick={handlePause}
            title="Pause timer"
          >
            <Pause className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/20 shrink-0"
          onClick={() => setConfirmDone(true)}
          disabled={isPending}
          title="Mark done & log time"
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function FloatingTimerWidget() {
  const { timers, pauseAll } = useTaskTimer();
  const [collapsed, setCollapsed] = useState(false);

  if (timers.length === 0) return null;

  const activeCount = timers.filter((t) => !t.paused).length;

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80 rounded-xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-gray-800 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Timer className={`h-4 w-4 ${activeCount > 0 ? "text-green-400 animate-pulse" : "text-yellow-400"}`} />
          <span className="text-sm font-medium text-white">
            {timers.length} timer{timers.length !== 1 ? "s" : ""}
            {activeCount > 0 && activeCount < timers.length && ` (${activeCount} active)`}
            {activeCount === 0 && " (paused)"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!collapsed && activeCount > 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20"
              onClick={(e) => {
                e.stopPropagation();
                pauseAll();
              }}
            >
              <Pause className="h-3 w-3 mr-1" />
              Pause All
            </Button>
          )}
          {collapsed ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Timer list */}
      {!collapsed && (
        <div className="px-4 py-1 divide-y divide-gray-800 max-h-60 overflow-y-auto">
          {timers.map((t) => (
            <TimerRow key={t.taskId} taskId={t.taskId} taskTitle={t.taskTitle} paused={t.paused} />
          ))}
        </div>
      )}

      {/* Multi-timer info */}
      {!collapsed && activeCount > 1 && (
        <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            Time is split equally across {activeCount} active timers
          </p>
        </div>
      )}
    </div>
  );
}
