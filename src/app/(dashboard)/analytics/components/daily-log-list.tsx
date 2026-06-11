"use client";

import { useMemo, useState, useTransition } from "react";
import { updateDailyLog, deleteDailyLog } from "@/server/actions/daily-logs";
import { formatDate } from "@/lib/time-utils";
import type { CategoryOption } from "@/lib/constants";
import type { DailyTimeLog } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const UNTAGGED_VALUE = "untagged";

interface DayGroup {
  date: string;
  total: number;
  logs: DailyTimeLog[];
}

function groupByDate(logs: DailyTimeLog[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const log of logs) {
    const group = map.get(log.date) ?? { date: log.date, total: 0, logs: [] };
    group.logs.push(log);
    group.total += log.hours;
    map.set(log.date, group);
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function categoryLabel(
  category: string | null,
  categoryMap: Record<string, { label: string; color: string }>
): { label: string; color: string | null } {
  if (!category) return { label: "Untagged", color: null };
  const found = categoryMap[category];
  return { label: found?.label ?? category, color: found?.color ?? null };
}

function LogRow({
  log,
  categoryOptions,
  categoryMap,
}: {
  log: DailyTimeLog;
  categoryOptions: CategoryOption[];
  categoryMap: Record<string, { label: string; color: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [hours, setHours] = useState(String(log.hours));
  const [error, setError] = useState<string | null>(null);

  function saveHours(): void {
    const parsed = parseFloat(hours);
    if (Number.isNaN(parsed) || parsed === log.hours) {
      setHours(String(log.hours));
      return;
    }
    startTransition(async () => {
      const result = await updateDailyLog(log.id, { hours: parsed });
      if (!result.ok) {
        setError(result.error);
        setHours(String(log.hours));
      } else {
        setError(null);
      }
    });
  }

  function saveCategory(next: string): void {
    startTransition(async () => {
      await updateDailyLog(log.id, { category: next === UNTAGGED_VALUE ? null : next });
    });
  }

  function remove(): void {
    if (!confirm("Delete this log entry?")) return;
    startTransition(() => {
      void deleteDailyLog(log.id);
    });
  }

  const cat = categoryLabel(log.category, categoryMap);

  return (
    <TableRow>
      <TableCell>
        <Select
          value={log.category ?? UNTAGGED_VALUE}
          onValueChange={saveCategory}
          disabled={isPending}
        >
          <SelectTrigger className="h-auto w-fit gap-1 border-0 bg-transparent p-0 hover:opacity-80 focus:ring-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-50">
            <SelectValue asChild>
              <span
                className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                style={
                  cat.color
                    ? { backgroundColor: cat.color, color: "white" }
                    : { backgroundColor: "var(--color-muted)", color: "var(--color-muted-foreground)" }
                }
              >
                {cat.label}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNTAGGED_VALUE}>Untagged</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <input
          type="number"
          step="0.25"
          min="0"
          max="24"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onBlur={saveHours}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          disabled={isPending}
          className="w-16 rounded border border-border bg-background px-1.5 py-0.5 text-right text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
        />
        {error && <span className="ml-1 text-xs text-destructive">!</span>}
      </TableCell>
      <TableCell className="text-muted-foreground">{log.note ?? "—"}</TableCell>
      <TableCell className="w-8">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          disabled={isPending}
          onClick={remove}
          title="Delete entry"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function DailyLogList({
  logs,
  categoryOptions,
  categoryMap,
}: {
  logs: DailyTimeLog[];
  categoryOptions: CategoryOption[];
  categoryMap: Record<string, { label: string; color: string }>;
}) {
  const groups = useMemo(() => groupByDate(logs), [logs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent days</CardTitle>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hours logged yet.</p>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.date}>
                <div className="mb-1 flex items-baseline justify-between border-b border-border/50 pb-1">
                  <span className="font-medium">{formatDate(group.date)}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round(group.total * 100) / 100}h total
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.logs.map((log) => (
                      <LogRow
                        key={log.id}
                        log={log}
                        categoryOptions={categoryOptions}
                        categoryMap={categoryMap}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
