"use client";

import { useState, useTransition } from "react";
import { createDailyLog, updateDailyLog, deleteDailyLog } from "@/server/actions/daily-logs";
import { formatDate, todayLocalISO } from "@/lib/time-utils";
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
import { Plus, Trash2 } from "lucide-react";

function dayName(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

function AddDayHoursForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(todayLocalISO);
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm(): void {
    setDate(todayLocalISO());
    setHours("");
    setNote("");
    setError(null);
  }

  function addLog(): void {
    const parsed = parseFloat(hours);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 24) {
      setError("Enter hours between 0 and 24.");
      return;
    }

    startTransition(async () => {
      const result = await createDailyLog({
        date,
        hours: parsed,
        category: null,
        note: note.trim() || null,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      resetForm();
      setIsOpen(false);
    });
  }

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add day hours
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)_auto] md:items-end">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={isPending}
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Hours</span>
          <input
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            disabled={isPending}
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Note</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={isPending}
            placeholder="Optional"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={addLog} disabled={isPending}>
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              resetForm();
              setIsOpen(false);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function LogRow({ log }: { log: DailyTimeLog }) {
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

  function remove(): void {
    if (!confirm("Delete this log entry?")) return;
    startTransition(() => {
      void deleteDailyLog(log.id);
    });
  }

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap font-medium">{formatDate(log.date)}</TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">{dayName(log.date)}</TableCell>
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

export function DailyLogList({ logs }: { logs: DailyTimeLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent days</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AddDayHoursForm />
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hours logged yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
