"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTimeEntry } from "@/server/actions/time-entries";
import { formatDateShort } from "@/lib/time-utils";
import { Plus } from "lucide-react";
import type { TimeEntry } from "@/types";

export function TimeEntriesLog({
  taskId,
  timeEntries,
}: {
  taskId: number;
  timeEntries: TimeEntry[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hours) return;
    startTransition(async () => {
      await createTimeEntry({
        taskId,
        hours: Number(hours),
        date,
        note: note || undefined,
      });
      setHours("");
      setNote("");
      setShowForm(false);
    });
  }

  const sorted = [...timeEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Time Entries</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-2 border-b pb-3">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.25"
              placeholder="Hours"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="h-8 w-20"
              required
            />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 flex-1"
            />
          </div>
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-8"
          />
          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={isPending}
          >
            {isPending ? "Adding..." : "Add Entry"}
          </Button>
        </form>
      )}

      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">No time entries yet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between text-sm"
            >
              <div className="min-w-0">
                <span className="text-muted-foreground">
                  {formatDateShort(entry.date)}
                </span>
                {entry.note && (
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.note}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-medium">{entry.hours}h</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
