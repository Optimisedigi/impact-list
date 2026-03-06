"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export interface TimerEntry {
  taskId: number;
  taskTitle: string;
  startedAt: number; // timestamp ms
  paused: boolean;
  // Segments track when concurrent timers change.
  // Each segment: [startMs, endMs | null, concurrentCount]
  segments: [number, number | null, number][];
}

interface TimerContextValue {
  timers: TimerEntry[];
  startTimer: (taskId: number, taskTitle: string) => void;
  pauseTimer: (taskId: number) => void;
  pauseAll: () => void;
  finishTimer: (taskId: number) => number; // returns accumulated hours, removes timer
  isRunning: (taskId: number) => boolean;
  isPaused: (taskId: number) => boolean;
  hasTimer: (taskId: number) => boolean;
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
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

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

  // Tick every second for live display (only when active timers exist)
  useEffect(() => {
    const hasActive = timers.some((t) => !t.paused);
    if (!hasActive) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timers]);

  const startTimer = useCallback((taskId: number, taskTitle: string) => {
    setTimers((prev) => {
      const existing = prev.find((t) => t.taskId === taskId);

      // Already running
      if (existing && !existing.paused) return prev;

      // Resume paused timer
      if (existing && existing.paused) {
        const now = Date.now();
        const activeCount = prev.filter((t) => !t.paused).length + 1;
        // Reopen segments on other active timers with new concurrent count
        const updated = prev.map((t) => {
          if (t.taskId === taskId) {
            return {
              ...t,
              paused: false,
              segments: [...t.segments, [now, null, activeCount] as [number, number | null, number]],
            };
          }
          if (!t.paused) {
            const segs = [...t.segments];
            const lastSeg = segs[segs.length - 1];
            if (lastSeg && lastSeg[1] === null) {
              lastSeg[1] = now;
              segs.push([now, null, activeCount]);
            }
            return { ...t, segments: segs };
          }
          return t;
        });
        return updated;
      }

      // New timer
      const now = Date.now();
      const activeCount = prev.filter((t) => !t.paused).length + 1;
      // Close & reopen segments on existing active timers with new concurrent count
      const updated = prev.map((t) => {
        if (t.paused) return t;
        const segs = [...t.segments];
        const lastSeg = segs[segs.length - 1];
        if (lastSeg && lastSeg[1] === null) {
          lastSeg[1] = now;
          segs.push([now, null, activeCount]);
        }
        return { ...t, segments: segs };
      });
      updated.push({
        taskId,
        taskTitle,
        paused: false,
        startedAt: now,
        segments: [[now, null, activeCount]],
      });
      return updated;
    });
  }, []);

  const pauseTimer = useCallback((taskId: number) => {
    setTimers((prev) => {
      const timer = prev.find((t) => t.taskId === taskId);
      if (!timer || timer.paused) return prev;

      const now = Date.now();
      const activeCount = prev.filter((t) => !t.paused).length - 1;

      return prev.map((t) => {
        if (t.taskId === taskId) {
          // Close the last segment and mark paused
          const segs = [...t.segments];
          const lastSeg = segs[segs.length - 1];
          if (lastSeg && lastSeg[1] === null) lastSeg[1] = now;
          return { ...t, paused: true, segments: segs };
        }
        if (!t.paused && activeCount > 0) {
          // Update concurrent count on remaining active timers
          const segs = [...t.segments];
          const lastSeg = segs[segs.length - 1];
          if (lastSeg && lastSeg[1] === null) {
            lastSeg[1] = now;
            segs.push([now, null, activeCount]);
          }
          return { ...t, segments: segs };
        }
        return t;
      });
    });
  }, []);

  const pauseAll = useCallback(() => {
    setTimers((prev) => {
      const now = Date.now();
      return prev.map((t) => {
        if (t.paused) return t;
        const segs = [...t.segments];
        const lastSeg = segs[segs.length - 1];
        if (lastSeg && lastSeg[1] === null) lastSeg[1] = now;
        return { ...t, paused: true, segments: segs };
      });
    });
  }, []);

  const finishTimer = useCallback((taskId: number): number => {
    let allocatedHours = 0;
    setTimers((prev) => {
      const now = Date.now();
      const timer = prev.find((t) => t.taskId === taskId);
      if (timer) {
        const segs = [...timer.segments];
        const lastSeg = segs[segs.length - 1];
        if (lastSeg && lastSeg[1] === null) lastSeg[1] = now;
        allocatedHours = calcAllocatedSeconds({ ...timer, segments: segs }, now) / 3600;
      }
      const remaining = prev.filter((t) => t.taskId !== taskId);
      // Update concurrent count on remaining active timers
      const activeCount = remaining.filter((t) => !t.paused).length;
      if (activeCount > 0) {
        const now2 = Date.now();
        return remaining.map((t) => {
          if (t.paused) return t;
          const segs = [...t.segments];
          const lastSeg = segs[segs.length - 1];
          if (lastSeg && lastSeg[1] === null) {
            lastSeg[1] = now2;
            segs.push([now2, null, activeCount]);
          }
          return { ...t, segments: segs };
        });
      }
      return remaining;
    });
    return allocatedHours;
  }, []);

  const isRunning = useCallback(
    (taskId: number) => timers.some((t) => t.taskId === taskId && !t.paused),
    [timers]
  );

  const isPaused = useCallback(
    (taskId: number) => timers.some((t) => t.taskId === taskId && t.paused),
    [timers]
  );

  const hasTimer = useCallback(
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
      value={{ timers, startTimer, pauseTimer, pauseAll, finishTimer, isRunning, isPaused, hasTimer, getAllocatedSeconds, tick }}
    >
      {children}
    </TimerContext.Provider>
  );
}
