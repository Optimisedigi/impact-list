"use client";

import { useState, useOptimistic, useTransition } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
import { CATEGORY_OPTIONS, STATUS_OPTIONS, TO_COMPLETE_OPTIONS } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";
import { daysLeft, formatDateShort } from "@/lib/time-utils";
import { MoreHorizontal, Trash2, Clock } from "lucide-react";

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
}: {
  task: Task;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  clientOptions: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticTask, setOptimisticTask] = useOptimistic(
    task,
    (current: Task, update: Partial<Task>) => ({ ...current, ...update })
  );

  function saveField(field: string, value: string | number | null) {
    startTransition(async () => {
      setOptimisticTask({ [field]: value } as Partial<Task>);
      await updateTaskField(task.id, field, value);
    });
  }

  const days = daysLeft(optimisticTask.deadline);
  const overdue = days !== null && days < 0;

  return (
    <TableRow
      className={`${isPending ? "opacity-60" : ""} ${overdue ? "bg-red-500/5" : ""} ${selected ? "bg-primary/5" : ""} [&>td]:align-middle`}
    >
      <TableCell className="w-10">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(!!checked)}
        />
      </TableCell>
      <TableCell>
        <InlineEdit
          value={optimisticTask.title}
          onSave={(v) => saveField("title", v)}
        />
      </TableCell>
      <TableCell>
        <Select
          value={optimisticTask.category}
          onValueChange={(v) => saveField("category", v)}
        >
          <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0">
            <CategoryBadge category={optimisticTask.category as CategoryKey} />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
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
          <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0">
            <StatusBadge status={optimisticTask.status} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={optimisticTask.toComplete ?? ""}
          onValueChange={(v) => saveField("toComplete", v || null)}
        >
          <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
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
            value={optimisticTask.client ?? ""}
            onValueChange={(v) => saveField("client", v || null)}
          >
            <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0">
              <SelectValue placeholder="--" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
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
            className="h-5 w-5"
            onClick={() => {
              const hours = prompt("Log hours:");
              if (hours) {
                startTransition(async () => {
                  await quickLogHours(task.id, Number(hours));
                });
              }
            }}
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
