"use client";

import { useState, useOptimistic, useTransition, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";
import { Zap, X, Check, GripVertical, CalendarClock, FileText, Play, Pause, MoreHorizontal } from "lucide-react";
import { updateTaskField, reorderFocusTasks, dismissFromFocus, setFocusPosition } from "@/server/actions/tasks";
import { quickLogHours } from "@/server/actions/time-entries";
import { useTaskTimer } from "@/components/timer/task-timer-context";
import { formatDateShort, daysLeft, todayLocalISO } from "@/lib/time-utils";
import { LogHoursDialog } from "./log-hours-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useDroppable,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFocusDnd } from "./focus-dnd-provider";

function SortableTaskCard({ task, index, isOverdue, positionCount, onMovePosition }: { task: Task; index: number; isOverdue?: boolean; positionCount?: number; onMovePosition?: (newIndex: number) => void }) {
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
      <TaskCard task={task} index={index} isOverdue={isOverdue} dragListeners={listeners} dragAttributes={attributes} positionCount={positionCount} onMovePosition={onMovePosition} />
    </div>
  );
}

function TaskCard({ task, index, isOverdue, dragListeners, dragAttributes, positionCount, onMovePosition }: { task: Task; index: number; isOverdue?: boolean; dragListeners?: DraggableSyntheticListeners; dragAttributes?: DraggableAttributes; positionCount?: number; onMovePosition?: (newIndex: number) => void }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [hoursInput, setHoursInput] = useState("");
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const router = useRouter();
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A dblclick also fires two clicks, so hold navigation briefly to see if a
  // second click arrives — one click opens the task, two edits the title.
  function handleTitleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setEditingTitle(true);
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      router.push(`/tasks?highlight=${task.id}`);
    }, 220);
  }
  const [optimisticTask, setOptimisticTask] = useOptimistic(
    task,
    (current: Task, update: Partial<Task>) => ({ ...current, ...update })
  );
  const submittedDeadlineRef = useRef(task.deadline ?? null);
  const cat = DEFAULT_CATEGORIES[task.category as CategoryKey];
  const { finishTimer, hasTimer, getAllocatedSeconds, startTimer, pauseTimer, isRunning } = useTaskTimer();

  function handleTitleChange(value: string) {
    setEditingTitle(false);
    const next = value.trim();
    if (!next || next === task.title) return;
    startTransition(async () => {
      setOptimisticTask({ title: next } as Partial<Task>);
      await updateTaskField(task.id, "title", next);
    });
  }

  function handleDeadlineChange(value: string) {
    setEditingDeadline(false);
    const newDeadline = value || null;
    if (newDeadline === submittedDeadlineRef.current) return;
    submittedDeadlineRef.current = newDeadline;
    startTransition(async () => {
      setOptimisticTask({ deadline: newDeadline } as Partial<Task>);
      await updateTaskField(task.id, "deadline", newDeadline);
    });
  }

  function startConfirm() {
    // Pre-fill with timer hours if available
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
      // Finish any running/paused timer
      if (hasTimer(task.id)) {
        finishTimer(task.id);
      }
      // Log user-entered hours
      const hours = parseFloat(hoursInput);
      if (!isNaN(hours) && hours > 0) {
        await quickLogHours(task.id, hours, todayLocalISO());
      }
      await updateTaskField(task.id, "status", "done");
      setConfirming(false);
    });
  }

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isPending ? 0.4 : 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`glass-strong relative group min-w-0 gap-2 ${isOverdue ? "glow-red border-red-500/40" : ""}`}>
        <div
          className="absolute left-0 top-0 h-1 w-full"
          style={{ backgroundColor: cat.color }}
        />
        <CardHeader className="pb-0 md:pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0 flex-wrap">
              {dragListeners && (
                <button
                  className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground -ml-1"
                  {...dragListeners}
                  {...dragAttributes}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              )}
              {onMovePosition && positionCount ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 cursor-pointer rounded border border-border/50 bg-transparent px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums outline-none hover:text-foreground hover:border-border focus:ring-1 focus:ring-ring"
                      title="Set priority position"
                    >
                      #{index + 1}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-16">
                    {Array.from({ length: positionCount }, (_, i) => (
                      <DropdownMenuItem
                        key={i + 1}
                        onClick={() => onMovePosition(i)}
                        className={`justify-center tabular-nums ${i === index ? "font-semibold text-foreground" : ""}`}
                      >
                        {i + 1}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="rounded border border-border/50 px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums shrink-0" title="Focus priority">
                  #{index + 1}
                </span>
              )}
              <Badge
                variant="outline"
                className="border-0 text-xs"
                style={{
                  backgroundColor: `color-mix(in oklch, ${cat.color} 20%, transparent)`,
                  color: cat.color,
                }}
              >
                {cat.label}
              </Badge>
              {task.category === "client_delivery" && task.client && (
                <Badge
                  className="border-0 text-xs bg-black text-white dark:bg-white dark:text-black"
                >
                  {task.client}
                </Badge>
              )}
              {task.leverageScore && (
                <div className="flex items-center gap-0.5 text-sm font-bold text-yellow-400 ml-auto shrink-0">
                  <Zap className="h-3.5 w-3.5" />
                  {task.leverageScore}
                </div>
              )}
            </div>
            <div className="flex items-center shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
                onClick={handleDismiss}
                disabled={isPending}
                title="Remove from focus"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <CardTitle className="text-base leading-tight break-words">
            {editingTitle ? (
              <input
                autoFocus
                defaultValue={optimisticTask.title}
                onBlur={(e) => handleTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="w-full rounded border border-border bg-background px-1.5 py-0.5 text-base outline-none focus:ring-1 focus:ring-ring"
              />
            ) : (
              <Link
                href={`/tasks?highlight=${task.id}`}
                onClick={handleTitleClick}
                className="hover:underline"
                title="Double-click to rename"
              >
                {optimisticTask.title}
              </Link>
            )}
          </CardTitle>
          {(() => {
            const deadline = optimisticTask.deadline;
            const days = deadline ? daysLeft(deadline) : null;
            const isOverdueDeadline = days !== null && days < 0;
            const isUrgent = days !== null && days >= 0 && days <= 3;
            return editingDeadline ? (
              <div className="flex items-center gap-1 mt-1">
                <CalendarClock className="h-3 w-3 text-muted-foreground" />
                <input
                  type="date"
                  autoFocus
                  defaultValue={deadline ?? ""}
                  className="text-xs rounded border border-border bg-background px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-ring"
                  onChange={(e) => {
                    handleDeadlineChange(e.target.value);
                  }}
                  onBlur={(e) => {
                    handleDeadlineChange(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") { setEditingDeadline(false); }
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                className={`flex items-center gap-1 text-xs mt-1 cursor-pointer hover:opacity-80 ${deadline ? isOverdueDeadline ? "text-red-400" : isUrgent ? "text-orange-400" : "text-muted-foreground" : "text-muted-foreground md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"}`}
                onClick={() => setEditingDeadline(true)}
                title={deadline ? "Click to edit deadline" : "Add due date"}
              >
                <CalendarClock className="h-3 w-3" />
                {deadline ? (
                  <>
                    <span>{formatDateShort(deadline)}</span>
                    {days !== null && (
                      <span>({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`})</span>
                    )}
                  </>
                ) : (
                  <span>Add due date</span>
                )}
              </button>
            );
          })()}
        </CardHeader>
        <CardContent className="pt-0">
          {task.sequenceReason && (
            <p className="text-xs text-muted-foreground italic">
              {task.sequenceReason}
            </p>
          )}
          {confirming ? (
            <div className="mt-2 space-y-2">
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
                    if (e.key === "Enter") handleMarkDone();
                    if (e.key === "Escape") setConfirming(false);
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="default" className="h-6 px-2 text-xs" onClick={handleMarkDone} disabled={isPending}>
                  Done
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-2">
              {task.toComplete && (
                <p className="text-xs text-foreground/80 truncate min-w-0 flex-1">
                  Next: {task.toComplete}
                </p>
              )}
              <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-auto md:flex md:opacity-0 md:group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 ${isRunning(task.id) ? "text-yellow-500" : "text-muted-foreground hover:text-green-500"}`}
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
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  asChild
                  title="Notes"
                >
                  <Link href={`/tasks/${task.id}`}>
                    <FileText className="h-3 w-3" />
                  </Link>
                </Button>
                <LogHoursDialog task={task} variant="icon" className="h-6 w-6" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-green-400"
                  onClick={startConfirm}
                  title="Mark as done"
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 h-7 w-7 shrink-0 text-muted-foreground md:hidden"
                    title="Task actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (isRunning(task.id)) {
                        pauseTimer(task.id);
                      } else {
                        startTimer(task.id, task.title);
                      }
                    }}
                  >
                    {isRunning(task.id) ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {isRunning(task.id) ? "Pause timer" : hasTimer(task.id) ? "Resume timer" : "Start timer"}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/tasks/${task.id}`}>
                      <FileText className="mr-2 h-4 w-4" />
                      Notes
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <LogHoursDialog task={task} variant="button" className="h-7 w-full justify-start px-0" />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={startConfirm}>
                    <Check className="mr-2 h-4 w-4" />
                    Mark as done
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDismiss} disabled={isPending} className="text-destructive">
                    <X className="mr-2 h-4 w-4" />
                    Remove from focus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function TopTasks({ tasks, overdueIds, queueTaskIds = [] }: { tasks: Task[]; overdueIds?: Set<number>; queueTaskIds?: number[] }) {
  const [items, setItems] = useState(tasks);
  const [, startTransition] = useTransition();
  const { registerReorder, registerItems } = useFocusDnd();
  const { setNodeRef, isOver } = useDroppable({ id: "top-priority-drop" });
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    registerItems("top-priority", items.map((t) => t.id));
  }, [registerItems, items]);

  // Sync with server data when tasks change
  const tasksKey = tasks.map((t) => `${t.id}:${t.deadline ?? ""}:${t.updatedAt}`).join(",");
  const [prevTasksKey, setPrevTasksKey] = useState(tasksKey);
  if (tasksKey !== prevTasksKey) {
    setItems(tasks);
    setPrevTasksKey(tasksKey);
  }

  useEffect(() => {
    registerReorder("top-priority", (activeId: number, overId: number) => {
      const prev = itemsRef.current;
      const oldIndex = prev.findIndex((t) => t.id === activeId);
      const newIndex = prev.findIndex((t) => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const newItems = arrayMove(prev, oldIndex, newIndex);
      setItems(newItems);
      const ids = newItems.map((t) => t.id);
      startTransition(async () => {
        // Pin the cards as top slots so the new order survives a refetch
        await reorderFocusTasks(ids, ids);
      });
    });
  }, [registerReorder, startTransition]);

  // Numbering is global across the focus page: these cards hold slots 1..N and
  // the This Week queue continues after them, so a card can be sent into the
  // queue by picking a later number.
  const visibleIds = [...items.map((t) => t.id), ...queueTaskIds];

  function movePosition(taskId: number, globalIndex: number) {
    const oldIndex = items.findIndex((t) => t.id === taskId);
    if (oldIndex !== -1 && globalIndex < items.length) {
      setItems(arrayMove(items, oldIndex, globalIndex));
    }
    startTransition(async () => {
      await setFocusPosition(taskId, globalIndex, visibleIds, items.length);
    });
  }

  if (items.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className={`flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors ${isOver ? "border-primary bg-primary/5" : ""}`}
      >
        {isOver ? "Drop here to promote to Top Priority" : "No tasks to focus on. Add tasks with leverage scores."}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} className={`rounded-lg transition-colors ${isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}>
      <SortableContext id="top-priority" items={items.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((task, i) => (
            <SortableTaskCard key={task.id} task={task} index={i} isOverdue={overdueIds?.has(task.id)} positionCount={visibleIds.length} onMovePosition={(newIndex) => movePosition(task.id, newIndex)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
