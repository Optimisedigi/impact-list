"use client";

import { useState, useOptimistic, useTransition, useRef, useEffect, useCallback } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CategoryBadge, StatusBadge, LeverageBadge } from "./priority-badge";
import { updateTaskField, deleteTask } from "@/server/actions/tasks";
import { quickLogHours } from "@/server/actions/time-entries";
import { STATUS_OPTIONS, TO_COMPLETE_OPTIONS } from "@/lib/constants";
import type { CategoryOption } from "@/lib/constants";
import type { Task } from "@/types";
import { daysLeft, formatDateShort } from "@/lib/time-utils";
import { MoreHorizontal, Trash2, Clock, Play, Pause, Copy, Repeat, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTaskTimer } from "@/components/timer/task-timer-context";
import type { CopiedCell } from "./task-table";

function InlineEdit({
  value,
  onSave,
  type = "text",
}: {
  value: string | number | null;
  onSave: (v: string) => void;
  type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (editing && type === "text") autoResize();
  }, [editing, draft, type, autoResize]);

  if (!editing) {
    return (
      <span
        className="cursor-pointer rounded px-1 py-0.5 hover:bg-muted block"
        onClick={() => setEditing(true)}
      >
        {value || <span className="text-muted-foreground">--</span>}
      </span>
    );
  }

  if (type !== "text") {
    return (
      <Input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-7 w-full min-w-[60px]"
        onBlur={() => {
          onSave(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(draft);
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <Textarea
      ref={textareaRef}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      className="min-h-7 w-full min-w-[60px] resize-none py-1 text-sm"
      rows={1}
      onBlur={() => {
        onSave(draft);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSave(draft);
          setEditing(false);
        }
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}

function InlineDateEdit({
  value,
  onSave,
  days,
  overdue,
}: {
  value: string | null;
  onSave: (v: string) => void;
  days: number | null;
  overdue: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <span
        className="cursor-pointer rounded px-1 py-0.5 hover:bg-muted block"
        onClick={() => setEditing(true)}
      >
        {value ? (
          <span className={overdue ? "text-red-400 font-medium" : ""}>
            {formatDateShort(value)}
            {days !== null && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({days}d)
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">--</span>
        )}
      </span>
    );
  }

  return (
    <Input
      autoFocus
      type="date"
      defaultValue={value ?? ""}
      className="h-7 w-full"
      onBlur={(e) => {
        onSave(e.target.value);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onSave((e.target as HTMLInputElement).value);
          setEditing(false);
        }
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}

export function TaskRow({
  task,
  selected,
  onSelect,
  clientOptions,
  categoryMap,
  categoryOptions,
  onCopyCell,
  isHighlighted,
}: {
  task: Task;
  selected: boolean;
  onSelect: (checked: boolean, shiftKey: boolean) => void;
  clientOptions: string[];
  categoryMap: Record<string, { label: string; color: string }>;
  categoryOptions: CategoryOption[];
  onCopyCell: (cell: CopiedCell) => void;
  isHighlighted?: boolean;
}) {
  const { startTimer, pauseTimer, isRunning, isPaused, finishTimer } = useTaskTimer();
  const timerActive = isRunning(task.id);
  const timerPaused = isPaused(task.id);
  const [isPending, startTransition] = useTransition();
  const [optimisticTask, setOptimisticTask] = useOptimistic(
    task,
    (current: Task, update: Partial<Task>) => ({ ...current, ...update })
  );

  function saveField(field: string, value: string | number | null) {
    startTransition(async () => {
      setOptimisticTask({ [field]: value } as Partial<Task>);
      // When marking done, finish any running/paused timer and log the accumulated time
      if (field === "status" && value === "done" && (timerActive || timerPaused)) {
        const hours = finishTimer(task.id);
        const rounded = Math.round(hours * 100) / 100;
        if (rounded > 0) {
          await quickLogHours(task.id, rounded);
        }
      }
      await updateTaskField(task.id, field, value);
    });
  }

  const days = daysLeft(optimisticTask.deadline);
  const overdue = days !== null && days < 0;

  return (
    <TableRow
      data-task-id={task.id}
      className={`group/row ${isPending ? "opacity-60" : ""} ${overdue ? "bg-red-500/5" : ""} ${selected ? "bg-primary/5" : ""} ${isHighlighted ? "animate-highlight-pulse" : ""} [&>td]:align-middle`}
    >
      <TableCell className="w-10">
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(!selected, e.shiftKey);
          }}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => {/* handled by parent onClick */}}
          />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <InlineEdit
            value={optimisticTask.title}
            onSave={(v) => saveField("title", v)}
          />
          <Link
            href={`/tasks/${task.id}`}
            className="shrink-0 opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
            title="Open task details"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          {optimisticTask.recurringTaskId && (
            <span title="Recurring task"><Repeat className="h-3 w-3 shrink-0 text-muted-foreground" /></span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={optimisticTask.category}
          onValueChange={(v) => saveField("category", v)}
        >
          <SelectTrigger className="h-7 w-full border-0 bg-transparent px-1 hover:bg-muted [&>span]:truncate">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <CategoryBadge category={c.value} categoryMap={categoryMap} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={optimisticTask.status}
          onValueChange={(v) => saveField("status", v)}
        >
          <SelectTrigger className="h-7 w-full border-0 bg-transparent px-1 hover:bg-muted [&>span]:truncate">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <StatusBadge status={s.value} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={optimisticTask.toComplete ?? "__none__"}
          onValueChange={(v) => saveField("toComplete", v === "__none__" ? null : v)}
        >
          <SelectTrigger className="h-7 w-full border-0 bg-transparent px-1 hover:bg-muted [&>span]:truncate">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">--</SelectItem>
            {TO_COMPLETE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {clientOptions.length > 0 ? (
          <Select
            value={optimisticTask.client ?? "__none__"}
            onValueChange={(v) => saveField("client", v === "__none__" ? null : v)}
          >
            <SelectTrigger className="h-7 w-full border-0 bg-transparent px-1 hover:bg-muted [&>span]:truncate">
              <SelectValue placeholder="--" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {clientOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <InlineEdit
            value={optimisticTask.client}
            onSave={(v) => saveField("client", v || null)}
          />
        )}
      </TableCell>
      <TableCell>
        <InlineDateEdit
          value={optimisticTask.deadline}
          onSave={(v) => saveField("deadline", v || null)}
          days={days}
          overdue={overdue}
        />
      </TableCell>
      <TableCell className="text-center">
        <InlineEdit
          value={optimisticTask.estimatedHours}
          onSave={(v) => saveField("estimatedHours", v ? Number(v) : null)}
          type="number"
        />
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center gap-1">
          <span>{optimisticTask.actualHours ?? 0}</span>
          <Button
            variant="ghost"
            size="icon"
            className={`h-5 w-5 ${timerActive ? "text-yellow-500 hover:text-yellow-400" : timerPaused ? "text-green-600 hover:text-green-500" : "text-green-600 hover:text-green-500"}`}
            onClick={() => {
              if (timerActive) {
                pauseTimer(task.id);
              } else {
                startTimer(task.id, optimisticTask.title);
              }
            }}
            title={timerActive ? "Pause timer" : timerPaused ? "Resume timer" : "Start timer"}
          >
            {timerActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => {
              const hours = prompt("Log hours:");
              if (hours) {
                startTransition(async () => {
                  await quickLogHours(task.id, Number(hours));
                });
              }
            }}
            title="Log hours manually"
          >
            <Clock className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <LeverageBadge score={optimisticTask.leverageScore} />
      </TableCell>
      <TableCell className="text-center">
        {optimisticTask.priorityScore ?? <span className="text-muted-foreground">--</span>}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCopyCell({ field: "category", value: optimisticTask.category })}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Category
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyCell({ field: "status", value: optimisticTask.status })}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyCell({ field: "client", value: optimisticTask.client })}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyCell({ field: "toComplete", value: optimisticTask.toComplete })}>
              <Copy className="mr-2 h-4 w-4" />
              Copy To Complete
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (confirm("Delete this task?")) {
                  startTransition(() => deleteTask(task.id));
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
