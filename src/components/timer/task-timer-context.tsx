"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export interface TimerEntry {
  taskId: number;
  taskTitle: string;
  startedAt: number; // timestamp ms
  // Segments track when concurrent timers change.
  // Each segment: [startMs, endMs | null, concurrentCount]
  segments: [number, number | null, number][];
}

interface TimerContextValue {
  timers: TimerEntry[];
  startTimer: (taskId: number, taskTitle: string) => void;
  stopTimer: (taskId: number) => number; // returns allocated hours
  stopAll: () => { taskId: number; taskTitle: string; hours: number }[];
  isRunning: (taskId: number) => boolean;
  getAllocatedSeconds: (taskId: number) => number;
  tick: number; // increments every second to trigger re-renders
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function useTaskTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTaskTimer must be inside TaskTimerProvider");
  return ctx;
}

const STORAGE_KEY = "impact-list-timers";

function loadTimers(): TimerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTimers(timers: TimerEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
}

function recalcSegments(timers: TimerEntry[]): TimerEntry[] {
  // Whenever concurrent count changes, close current segments and open new ones
  const activeCount = timers.length;
  return timers.map((t) => {
    const segs = [...t.segments];
    const lastSeg = segs[segs.length - 1];
    if (lastSeg && lastSeg[1] === null && lastSeg[2] !== activeCount) {
      // Close current segment and start new one with updated count
      const now = Date.now();
      lastSeg[1] = now;
      segs.push([now, null, activeCount]);
    }
    return { ...t, segments: segs };
  });
}

function calcAllocatedSeconds(timer: TimerEntry, now: number): number {
  let total = 0;
  for (const [start, end, concurrent] of timer.segments) {
    const elapsed = ((end ?? now) - start) / 1000;
    total += elapsed / concurrent;
  }
  return total;
}

export function TaskTimerProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = useState<TimerEntry[]>([]);
  const [tick, setTick] = useState(0);
  const timersRef = useRef(timers);
  timersRef.current = timers;

  // Load from localStorage on mount
  useEffect(() => {
    setTimers(loadTimers());
  }, []);

  // Save to localStorage whenever timers change
  useEffect(() => {
    if (timers.length > 0 || localStorage.getItem(STORAGE_KEY)) {
      saveTimers(timers);
    }
  }, [timers]);

  // Tick every second for live display
  useEffect(() => {
    if (timers.length === 0) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timers.length]);

  const startTimer = useCallback((taskId: number, taskTitle: string) => {
    setTimers((prev) => {
      if (prev.find((t) => t.taskId === taskId)) return prev; // already running
      const now = Date.now();
      const newCount = prev.length + 1;
      // Close & reopen segments on existing timers with new concurrent count
      const updated = prev.map((t) => {
        const segs = [...t.segments];
        const lastSeg = segs[segs.length - 1];
        if (lastSeg && lastSeg[1] === null) {
          lastSeg[1] = now;
          segs.push([now, null, newCount]);
        }
        return { ...t, segments: segs };
      });
      updated.push({
        taskId,
        taskTitle,
        startedAt: now,
        segments: [[now, null, newCount]],
      });
      return updated;
    });
  }, []);

  const stopTimer = useCallback((taskId: number): number => {
    let allocatedHours = 0;
    setTimers((prev) => {
      const now = Date.now();
      const timer = prev.find((t) => t.taskId === taskId);
      if (timer) {
        // Close the last segment
        const segs = [...timer.segments];
        const lastSeg = segs[segs.length - 1];
        if (lastSeg && lastSeg[1] === null) lastSeg[1] = now;
        allocatedHours = calcAllocatedSeconds({ ...timer, segments: segs }, now) / 3600;
      }
      const remaining = prev.filter((t) => t.taskId !== taskId);
      const newCount = remaining.length;
      // Update concurrent count on remaining timers
      if (newCount > 0) {
        return remaining.map((t) => {
          const segs = [...t.segments];
          const lastSeg = segs[segs.length - 1];
          if (lastSeg && lastSeg[1] === null) {
            lastSeg[1] = now;
            segs.push([now, null, newCount]);
          }
          return { ...t, segments: segs };
        });
      }
      return [];
    });
    return allocatedHours;
  }, []);

  const stopAll = useCallback((): { taskId: number; taskTitle: string; hours: number }[] => {
    const now = Date.now();
    const results: { taskId: number; taskTitle: string; hours: number }[] = [];
    setTimers((prev) => {
      for (const timer of prev) {
        const segs = [...timer.segments];
        const lastSeg = segs[segs.length - 1];
        if (lastSeg && lastSeg[1] === null) lastSeg[1] = now;
        const hours = calcAllocatedSeconds({ ...timer, segments: segs }, now) / 3600;
        results.push({ taskId: timer.taskId, taskTitle: timer.taskTitle, hours });
      }
      return [];
    });
    return results;
  }, []);

  const isRunning = useCallback(
    (taskId: number) => timers.some((t) => t.taskId === taskId),
    [timers]
  );

  const getAllocatedSeconds = useCallback(
    (taskId: number) => {
      void tick; // use tick to force recalc
      const timer = timersRef.current.find((t) => t.taskId === taskId);
      if (!timer) return 0;
      return calcAllocatedSeconds(timer, Date.now());
    },
    [tick]
  );

  return (
    <TimerContext.Provider
      value={{ timers, startTimer, stopTimer, stopAll, isRunning, getAllocatedSeconds, tick }}
    >
      {children}
    </TimerContext.Provider>
  );
}
