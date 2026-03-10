"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";
import { Zap, X, Check, GripVertical } from "lucide-react";
import { updateTaskField, reorderFocusTasks } from "@/server/actions/tasks";
import { dismissFromFocus } from "@/server/actions/tasks";
import { quickLogHours } from "@/server/actions/time-entries";
import { useTaskTimer } from "@/components/timer/task-timer-context";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableTaskCard({ task, index, isOverdue }: { task: Task; index: number; isOverdue?: boolean }) {
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
      <TaskCard task={task} index={index} isOverdue={isOverdue} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

function TaskCard({ task, index, isOverdue, dragListeners, dragAttributes }: { task: Task; index: number; isOverdue?: boolean; dragListeners?: DraggableSyntheticListeners; dragAttributes?: DraggableAttributes }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [hoursInput, setHoursInput] = useState("");
  const cat = DEFAULT_CATEGORIES[task.category as CategoryKey];
  const { finishTimer, hasTimer, getAllocatedSeconds } = useTaskTimer();

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
        await quickLogHours(task.id, hours);
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
      <Card className={`glass-strong relative overflow-hidden group ${isOverdue ? "glow-red border-red-500/40" : ""}`}>
        <div
          className="absolute left-0 top-0 h-1 w-full"
          style={{ backgroundColor: cat.color }}
        />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {dragListeners && (
                <button
                  className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground -ml-1"
                  {...dragListeners}
                  {...dragAttributes}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
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
            </div>
            <div className="flex items-center gap-0.5">
              {task.leverageScore && (
                <div className="flex items-center gap-1 text-sm font-bold text-yellow-400">
                  <Zap className="h-3.5 w-3.5" />
                  {task.leverageScore}
                </div>
              )}
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
          <CardTitle className="text-base leading-tight">
            <Link href={`/tasks?highlight=${task.id}`} className="hover:underline">
              {task.title}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                <p className="text-sm text-foreground/80">
                  Next: {task.toComplete}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-green-400 ml-auto"
                onClick={startConfirm}
              >
                <Check className="h-3 w-3 mr-1" />
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function TopTasks({ tasks, overdueIds }: { tasks: Task[]; overdueIds?: Set<number> }) {
  const [items, setItems] = useState(tasks);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // Sync with server data when tasks change
  const taskIds = tasks.map((t) => t.id).join(",");
  const [prevIds, setPrevIds] = useState(taskIds);
  if (taskIds !== prevIds) {
    setItems(tasks);
    setPrevIds(taskIds);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);
    startTransition(async () => {
      await reorderFocusTasks(newItems.map((t) => t.id));
    });
  }

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        No tasks to focus on. Add tasks with leverage scores.
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((task, i) => (
            <SortableTaskCard key={task.id} task={task} index={i} isOverdue={overdueIds?.has(task.id)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
