"use client";

import { useOptimistic, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { updateTaskField } from "@/server/actions/tasks";
import { STATUS_OPTIONS, TO_COMPLETE_OPTIONS } from "@/lib/constants";
import { CategoryBadge, StatusBadge, LeverageBadge } from "../../components/priority-badge";
import { formatDateShort, daysLeft } from "@/lib/time-utils";
import type { Task } from "@/types";
import type { CategoryOption } from "@/lib/constants";

export function TaskMetadataSidebar({
  task,
  clientOptions,
  categoryMap,
  categoryOptions,
}: {
  task: Task;
  clientOptions: string[];
  categoryMap: Record<string, { label: string; color: string }>;
  categoryOptions: CategoryOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    task,
    (current: Task, update: Partial<Task>) => ({ ...current, ...update })
  );

  function saveField(field: string, value: string | number | null) {
    startTransition(async () => {
      setOptimistic({ [field]: value } as Partial<Task>);
      await updateTaskField(task.id, field, value);
    });
  }

  const days = daysLeft(optimistic.deadline);

  return (
    <div
      className={`rounded-lg border bg-card p-4 space-y-4 ${isPending ? "opacity-60" : ""}`}
    >
      <h2 className="text-sm font-medium">Details</h2>

      <Field label="Status">
        <Select
          value={optimistic.status}
          onValueChange={(v) => saveField("status", v)}
        >
          <SelectTrigger className="h-8 w-full">
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
      </Field>

      <Field label="Category">
        <Select
          value={optimistic.category}
          onValueChange={(v) => saveField("category", v)}
        >
          <SelectTrigger className="h-8 w-full">
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
      </Field>

      <Field label="To Complete">
        <Select
          value={optimistic.toComplete ?? "__none__"}
          onValueChange={(v) =>
            saveField("toComplete", v === "__none__" ? null : v)
          }
        >
          <SelectTrigger className="h-8 w-full">
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
      </Field>

      <Field label="Client">
        <Select
          value={optimistic.client ?? "__none__"}
          onValueChange={(v) =>
            saveField("client", v === "__none__" ? null : v)
          }
        >
          <SelectTrigger className="h-8 w-full">
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
      </Field>

      <Field label="Deadline">
        <Input
          type="date"
          value={optimistic.deadline ?? ""}
          onChange={(e) => saveField("deadline", e.target.value || null)}
          className="h-8"
        />
        {days !== null && (
          <span
            className={`text-xs ${days < 0 ? "text-red-400" : "text-muted-foreground"}`}
          >
            {days < 0
              ? `${Math.abs(days)}d overdue`
              : `${days}d left`}
          </span>
        )}
      </Field>

      <Field label="Estimated Hours">
        <Input
          type="number"
          step="0.5"
          value={optimistic.estimatedHours ?? ""}
          onChange={(e) =>
            saveField(
              "estimatedHours",
              e.target.value ? Number(e.target.value) : null
            )
          }
          onBlur={(e) =>
            saveField(
              "estimatedHours",
              e.target.value ? Number(e.target.value) : null
            )
          }
          className="h-8"
        />
      </Field>

      <Field label="Actual Hours">
        <span className="text-sm">{optimistic.actualHours ?? 0}h</span>
      </Field>

      <Field label="Leverage">
        <LeverageBadge score={optimistic.leverageScore} />
      </Field>

      <Field label="Priority Score">
        <span className="text-sm">
          {optimistic.priorityScore ?? (
            <span className="text-muted-foreground">--</span>
          )}
        </span>
      </Field>

      {optimistic.sequenceReason && (
        <Field label="Sequence Reason">
          <p className="text-xs text-muted-foreground">
            {optimistic.sequenceReason}
          </p>
        </Field>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
