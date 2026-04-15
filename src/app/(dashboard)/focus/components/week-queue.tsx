"use client";

import { useState, useOptimistic, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";
import { formatDateShort } from "@/lib/time-utils";
import { Zap, Repeat, X, Check, GripVertical, ArrowUpToLine, FileText, Play, Pause, AlertTriangle } from "lucide-react";
import { updateTaskField, dismissFromFocus, reorderFocusTasks, promoteToTopPriority } from "@/server/actions/tasks";
import { quickLogHours } from "@/server/actions/time-entries";
import { useTaskTimer } from "@/components/timer/task-timer-context";
import Link from "next/link";
import {
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFocusDnd } from "./focus-dnd-provider";

function SortableQueueItem({ task, isOverdue }: { task: Task; isOverdue?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QueueItem task={task} isOverdue={isOverdue} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

function QueueItem({ task, isOverdue, dragListeners, dragAttributes }: { task: Task; isOverdue?: boolean; dragListeners?: DraggableSyntheticListeners; dragAttributes?: DraggableAttributes }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [hoursInput, setHoursInput] = useState("");
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [optimisticTask, setOptimisticTask] = useOptimistic(
    task,
    (current: Task, update: Partial<Task>) => ({ ...current, ...update })
  );
  const cat = DEFAULT_CATEGORIES[task.category as CategoryKey];
  const { finishTimer, hasTimer, getAllocatedSeconds, startTimer, pauseTimer, isRunning } = useTaskTimer();

  function handleDeadlineChange(value: string) {
    setEditingDeadline(false);
    const newDeadline = value || null;
    if (newDeadline === task.deadline) return;
    startTransition(async () => {
      setOptimisticTask({ deadline: newDeadline } as Partial<Task>);
      await updateTaskField(task.id, "deadline", newDeadline);
    });
  }

  function startConfirm() {
    if (hasTimer(task.id)) {
      const secs = getAllocatedSeconds(task.id);
      const h = Math.round((secs / 3600) * 100) / 100;
      setHoursInput(h > 0 ? String(h) : "");
    } else {
      setHoursInput("");
    }
    setConfirming(true);
  }

  function handleDismiss() {
    startTransition(async () => {
      await dismissFromFocus(task.id);
    });
  }

  function handleMarkDone() {
    startTransition(async () => {
      if (hasTimer(task.id)) {
        finishTimer(task.id);
      }
      const hours = parseFloat(hoursInput);
      if (!isNaN(hours) && hours > 0) {
        await quickLogHours(task.id, hours);
      }
      await updateTaskField(task.id, "status", "done");
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
        <span className="truncate text-sm">{task.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Hours:</label>
          <input
            type="number"
            step="0.25"
            min="0"
            value={hoursInput}
            onChange={(e) => setHoursInput(e.target.value)}
            placeholder="0"
            autoFocus
            className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleMarkDone();
              if (e.key === "Escape") setConfirming(false);
            }}
          />
          <Button size="sm" variant="default" className="h-6 px-2 text-xs" onClick={handleMarkDone} disabled={isPending}>
            Done
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center rounded-md border px-3 py-2 group ${isOverdue ? "glow-red border-red-500/40" : "border-border/50"} ${isPending ? "opacity-40" : ""}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {dragListeners && (
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 -ml-1"
            {...dragListeners}
            {...dragAttributes}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <div
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: cat.color }}
        />
        <Link href={`/tasks?highlight=${task.id}`} className="truncate text-sm hover:underline" title={task.title}>
          {task.title}
        </Link>
        {task.recurringTaskId && (
          <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {editingDeadline ? (
          <input
            type="date"
            autoFocus
            defaultValue={optimisticTask.deadline ?? ""}
            className="text-xs rounded border border-border bg-background px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-ring"
            onBlur={(e) => handleDeadlineChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") { setEditingDeadline(false); }
            }}
          />
        ) : optimisticTask.deadline ? (
          <span
            className="text-xs text-muted-foreground group-hover:hidden cursor-pointer hover:text-foreground"
            onClick={() => setEditingDeadline(true)}
            title="Click to edit deadline"
          >
            {formatDateShort(optimisticTask.deadline)}
          </span>
        ) : null}
        {task.leverageScore && (
          <Badge variant="outline" className="border-0 text-xs text-yellow-400 group-hover:hidden">
            <Zap className="mr-0.5 h-3 w-3" />
            {task.leverageScore}
          </Badge>
        )}
        {isRunning(task.id) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-yellow-500 group-hover:hidden"
            onClick={() => pauseTimer(task.id)}
            title="Pause timer"
          >
            <Pause className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-2">
        <Button
          variant="ghost"
          size="icon"
          className={`h-5 w-5 transition-opacity ${isRunning(task.id) ? "text-yellow-500" : "text-muted-foreground hover:text-green-500"}`}
          onClick={() => {
            if (isRunning(task.id)) {
              pauseTimer(task.id);
            } else {
              startTimer(task.id, task.title);
            }
          }}
          title={isRunning(task.id) ? "Pause timer" : hasTimer(task.id) ? "Resume timer" : "Start timer"}
        >
          {isRunning(task.id) ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-primary"
          asChild
          title="Open notes"
        >
          <Link href={`/tasks/${task.id}`}>
            <FileText className="h-3 w-3" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-primary"
          onClick={() => {
            startTransition(async () => {
              await promoteToTopPriority(task.id);
            });
          }}
          disabled={isPending}
          title="Move to top priority"
        >
          <ArrowUpToLine className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-green-400"
          onClick={startConfirm}
          title="Mark as done"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-red-400"
          onClick={handleDismiss}
          disabled={isPending}
          title="Remove from focus"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function WeekQueue({ tasks, overdueIds, overdueTasks }: { tasks: Task[]; overdueIds?: Set<number>; overdueTasks?: Task[] }) {
  const [items, setItems] = useState(tasks);
  const [, startTransition] = useTransition();
  const { registerReorder } = useFocusDnd();

  const taskIds = tasks.map((t) => t.id).join(",");
  const [prevIds, setPrevIds] = useState(taskIds);
  if (taskIds !== prevIds) {
    setItems(tasks);
    setPrevIds(taskIds);
  }

  useEffect(() => {
    registerReorder("week-queue", (activeId: number, overId: number) => {
      setItems((prev) => {
        const oldIndex = prev.findIndex((t) => t.id === activeId);
        const newIndex = prev.findIndex((t) => t.id === overId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const newItems = arrayMove(prev, oldIndex, newIndex);
        startTransition(async () => {
          await reorderFocusTasks(newItems.map((t) => t.id));
        });
        return newItems;
      });
    });
  }, [registerReorder, startTransition]);

  const hasOverdue = overdueTasks && overdueTasks.length > 0;
  const isEmpty = items.length === 0 && !hasOverdue;

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">This Week</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">No tasks due this week.</p>
        ) : (
          <div className="space-y-3">
            {hasOverdue && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-xs font-medium text-red-400 uppercase tracking-wider">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue ({overdueTasks.length})
                </h4>
                {overdueTasks.map((task) => (
                  <QueueItem key={task.id} task={task} isOverdue />
                ))}
              </div>
            )}
            {items.length > 0 && (
              <SortableContext id="week-queue" items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map((task) => (
                    <SortableQueueItem key={task.id} task={task} isOverdue={overdueIds?.has(task.id)} />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
