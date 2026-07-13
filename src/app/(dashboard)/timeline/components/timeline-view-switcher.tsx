"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TimelineChart } from "./timeline-chart";
import { MultitaskView } from "./multitask-view";
import type { TimelineTask } from "@/server/queries/timeline";
import type { MultitaskColumn } from "@/server/actions/multitask-columns";

type TimelineView = "timeline" | "multitask";

interface TimelineViewSwitcherProps {
  tasks: TimelineTask[];
  allTasks: TimelineTask[];
  categoryMap: Record<string, { label: string; color: string }>;
  clients: string[];
  initialMultitaskColumns: MultitaskColumn[];
}

const VIEWS: { value: TimelineView; label: string }[] = [
  { value: "timeline", label: "Timeline" },
  { value: "multitask", label: "Multitask" },
];

export function TimelineViewSwitcher({
  tasks,
  allTasks,
  categoryMap,
  clients,
  initialMultitaskColumns,
}: TimelineViewSwitcherProps) {
  const [view, setView] = useState<TimelineView>("timeline");

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
          <p className="text-sm text-muted-foreground">
            Plan major projects across weekly columns, with a today marker and a few weeks of recent context.
          </p>
        </div>
        <div className="inline-flex shrink-0 rounded-lg border border-border bg-muted/30 p-1 text-sm">
          {VIEWS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setView(option.value)}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                view === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {view === "timeline" ? (
          <TimelineChart tasks={tasks} allTasks={allTasks} categoryMap={categoryMap} clients={clients} />
        ) : (
          <MultitaskView tasks={allTasks} initialColumns={initialMultitaskColumns} />
        )}
      </div>
    </div>
  );
}
