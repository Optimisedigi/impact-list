"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useTaskTimer } from "./task-timer-context";
import { quickLogHours } from "@/server/actions/time-entries";
import { Square, StopCircle, Timer, ChevronDown, ChevronUp } from "lucide-react";
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

function TimerRow({ taskId, taskTitle }: { taskId: number; taskTitle: string }) {
  const { stopTimer, getAllocatedSeconds, tick } = useTaskTimer();
  const [isPending, startTransition] = useTransition();
  const [logged, setLogged] = useState(false);

  const allocated = getAllocatedSeconds(taskId);
  // Wall time is just allocated * concurrent (but we show allocated)

  function handleStop() {
    const hours = stopTimer(taskId);
    const roundedHours = Math.round(hours * 100) / 100;
    if (roundedHours > 0) {
      startTransition(async () => {
        await quickLogHours(taskId, roundedHours);
        setLogged(true);
      });
    }
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{taskTitle}</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-400 font-mono text-base tabular-nums">
            {formatTime(allocated)}
          </span>
          <span className="text-gray-400">
            allocated: {formatHours(allocated / 3600)}
          </span>
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 shrink-0"
        onClick={handleStop}
        disabled={isPending}
        title="Stop timer"
      >
        <Square className="h-4 w-4 fill-current" />
      </Button>
    </div>
  );
}

export function FloatingTimerWidget() {
  const { timers, stopAll, tick } = useTaskTimer();
  const [isPending, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState(false);

  if (timers.length === 0) return null;

  function handleStopAll() {
    const results = stopAll();
    startTransition(async () => {
      for (const r of results) {
        const rounded = Math.round(r.hours * 100) / 100;
        if (rounded > 0) {
          await quickLogHours(r.taskId, rounded);
        }
      }
    });
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80 rounded-xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-gray-800 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-green-400 animate-pulse" />
          <span className="text-sm font-medium text-white">
            {timers.length} timer{timers.length !== 1 ? "s" : ""} running
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!collapsed && timers.length > 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
              onClick={(e) => {
                e.stopPropagation();
                handleStopAll();
              }}
              disabled={isPending}
            >
              <StopCircle className="h-3 w-3 mr-1" />
              Stop All
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
            <TimerRow key={t.taskId} taskId={t.taskId} taskTitle={t.taskTitle} />
          ))}
        </div>
      )}

      {/* Multi-timer info */}
      {!collapsed && timers.length > 1 && (
        <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            Time is split equally across {timers.length} active timers
          </p>
        </div>
      )}
    </div>
  );
}
