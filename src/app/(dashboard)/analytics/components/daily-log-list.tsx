"use client";

import { useState, useTransition } from "react";
import { updateDailyLog, deleteDailyLog } from "@/server/actions/daily-logs";
import { formatDate } from "@/lib/time-utils";
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
import { Trash2 } from "lucide-react";

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
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hours logged yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
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
