"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NotesEditor } from "./notes-editor";
import { TaskMetadataSidebar } from "./task-metadata-sidebar";
import { TimeEntriesLog } from "./time-entries-log";
import type { Task, TimeEntry } from "@/types";
import type { CategoryOption } from "@/lib/constants";

export function TaskDetailView({
  task,
  timeEntries,
  clientOptions,
  categoryMap,
  categoryOptions,
}: {
  task: Task;
  timeEntries: TimeEntry[];
  clientOptions: string[];
  categoryMap: Record<string, { label: string; color: string }>;
  categoryOptions: CategoryOption[];
}) {
  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden">
      <div className="shrink-0 pb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/tasks"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Tasks
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-md">
            {task.title}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 flex gap-6 overflow-hidden">
        <div className="flex-[7] min-h-0 overflow-y-auto">
          <NotesEditor taskId={task.id} initialContent={task.notes} />
        </div>
        <div className="flex-[3] min-h-0 overflow-y-auto space-y-4">
          <TaskMetadataSidebar
            task={task}
            clientOptions={clientOptions}
            categoryMap={categoryMap}
            categoryOptions={categoryOptions}
          />
          <TimeEntriesLog taskId={task.id} timeEntries={timeEntries} />
        </div>
      </div>
    </div>
  );
}
