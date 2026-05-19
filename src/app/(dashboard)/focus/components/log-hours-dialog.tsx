"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock } from "lucide-react";
import { quickLogHours } from "@/server/actions/time-entries";
import { useTaskTimer } from "@/components/timer/task-timer-context";
import { todayLocalISO } from "@/lib/time-utils";
import type { Task } from "@/types";

interface LogHoursDialogProps {
  task: Task;
  variant?: "icon" | "button";
  className?: string;
}

export function LogHoursDialog({ task, variant = "icon", className = "" }: LogHoursDialogProps) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [isPending, startTransition] = useTransition();
  const { finishTimer, hasTimer, getAllocatedSeconds } = useTaskTimer();

  function handleOpenChange(o: boolean) {
    if (o) {
      // Pre-fill with timer hours if running on this task
      if (hasTimer(task.id)) {
        const secs = getAllocatedSeconds(task.id);
        const h = Math.round((secs / 3600) * 100) / 100;
        setHours(h > 0 ? String(h) : "");
      } else {
        setHours("");
      }
    }
    setOpen(o);
  }

  function handleLog() {
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0) return;
    startTransition(async () => {
      // Stop timer if running and log its accumulated time too
      if (hasTimer(task.id)) {
        finishTimer(task.id);
      }
      await quickLogHours(task.id, h, todayLocalISO());
      setOpen(false);
      setHours("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleLog} disabled={isPending || !hours}>
              Log
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
