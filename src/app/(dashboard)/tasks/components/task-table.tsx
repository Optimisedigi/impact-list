"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TaskRow } from "./task-row";
import { deleteTasks } from "@/server/actions/tasks";
import { Trash2 } from "lucide-react";
import type { Task } from "@/types";

const defaultColumns = [
  { key: "select", label: "", defaultWidth: 40 },
  { key: "title", label: "Task", defaultWidth: 320 },
  { key: "category", label: "Category", defaultWidth: 150 },
  { key: "status", label: "Status", defaultWidth: 110 },
  { key: "toComplete", label: "To Complete", defaultWidth: 110 },
  { key: "client", label: "Client", defaultWidth: 100 },
  { key: "deadline", label: "Deadline", defaultWidth: 120 },
  { key: "estimatedHours", label: "Est. Hrs", defaultWidth: 70 },
  { key: "actualHours", label: "Actual", defaultWidth: 70 },
  { key: "leverageScore", label: "Leverage", defaultWidth: 70 },
  { key: "priorityScore", label: "Priority", defaultWidth: 70 },
  { key: "actions", label: "", defaultWidth: 40 },
];

function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const startX = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startX.current = e.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX.current;
        startX.current = moveEvent.clientX;
        onResize(delta);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [onResize]
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60"
    />
  );
}

export function TaskTable({ tasks, clientOptions }: { tasks: Task[]; clientOptions: string[] }) {
  const [widths, setWidths] = useState(() =>
    defaultColumns.map((c) => c.defaultWidth)
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();

  const handleResize = useCallback((index: number, delta: number) => {
    setWidths((prev) => {
      const next = [...prev];
      next[index] = Math.max(40, next[index] + delta);
      return next;
    });
  }, []);

  const allSelected = tasks.length > 0 && selected.size === tasks.length;

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelected(new Set(tasks.map((t) => t.id)));
    } else {
      setSelected(new Set());
    }
  }

  function toggleOne(id: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} task${selected.size > 1 ? "s" : ""}?`)) return;
    startTransition(async () => {
      await deleteTasks(Array.from(selected));
      setSelected(new Set());
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        No tasks yet. Add one or import from CSV.
      </div>
    );
  }

  const totalWidth = widths.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-2">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {selected.size} task{selected.size > 1 ? "s" : ""} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isPending}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            {isPending ? "Deleting..." : "Delete"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}
      <div className="rounded-lg border overflow-x-auto">
        <Table style={{ width: `${totalWidth}px`, tableLayout: "fixed" }}>
          <TableHeader>
            <TableRow>
              {defaultColumns.map((col, i) => (
                <TableHead
                  key={col.key}
                  className="relative text-xs whitespace-nowrap"
                  style={{ width: `${widths[i]}px` }}
                >
                  {col.key === "select" ? (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => toggleAll(!!checked)}
                    />
                  ) : (
                    col.label
                  )}
                  {col.key !== "actions" && col.key !== "select" && (
                    <ResizeHandle onResize={(delta) => handleResize(i, delta)} />
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                selected={selected.has(task.id)}
                onSelect={(checked) => toggleOne(task.id, checked)}
                clientOptions={clientOptions}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
