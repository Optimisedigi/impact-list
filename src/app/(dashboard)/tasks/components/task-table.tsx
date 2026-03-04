"use client";

import { useState, useCallback, useRef, useTransition, useEffect } from "react";
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
import { deleteTasks, duplicateTasks, bulkUpdateField } from "@/server/actions/tasks";
import { Trash2, Copy, Clipboard } from "lucide-react";
import type { Task } from "@/types";

const defaultColumns = [
  { key: "select", label: "", defaultWidth: 40 },
  { key: "title", label: "Task", defaultWidth: 300 },
  { key: "category", label: "Category", defaultWidth: 200 },
  { key: "status", label: "Status", defaultWidth: 140 },
  { key: "toComplete", label: "To Complete", defaultWidth: 130 },
  { key: "client", label: "Client", defaultWidth: 120 },
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

import type { CategoryOption } from "@/lib/constants";

export type CopiedCell = { field: string; value: string | number | null };

export function TaskTable({ tasks, clientOptions, categoryMap, categoryOptions, highlightId }: { tasks: Task[]; clientOptions: string[]; categoryMap: Record<string, { label: string; color: string }>; categoryOptions: CategoryOption[]; highlightId?: number }) {
  const [widths, setWidths] = useState(() =>
    defaultColumns.map((c) => c.defaultWidth)
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const lastClickedIndex = useRef<number | null>(null);
  const [copiedRows, setCopiedRows] = useState<number[]>([]);
  const [copiedCell, setCopiedCell] = useState<CopiedCell | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState(highlightId);

  // Scroll to highlighted task and clear after animation
  useEffect(() => {
    if (!highlightId) return;
    setActiveHighlightId(highlightId);
    const timer = setTimeout(() => {
      const row = document.querySelector(`[data-task-id="${highlightId}"]`);
      if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    const clearTimer = setTimeout(() => setActiveHighlightId(undefined), 2500);
    return () => { clearTimeout(timer); clearTimeout(clearTimer); };
  }, [highlightId]);

  // Keyboard shortcut handler for Cmd+C / Cmd+V
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      // Don't intercept if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "c" && selected.size > 0) {
        e.preventDefault();
        setCopiedRows(Array.from(selected));
        setCopiedCell(null);
      }

      if (e.key === "v") {
        if (copiedCell && selected.size > 0) {
          e.preventDefault();
          startTransition(async () => {
            await bulkUpdateField(Array.from(selected), copiedCell.field, copiedCell.value);
          });
        } else if (copiedRows.length > 0) {
          e.preventDefault();
          startTransition(async () => {
            await duplicateTasks(copiedRows);
            setCopiedRows([]);
          });
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selected, copiedRows, copiedCell, startTransition]);

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

  function toggleOne(index: number, id: number, checked: boolean, shiftKey: boolean) {
    if (shiftKey && lastClickedIndex.current !== null && checked) {
      const start = Math.min(lastClickedIndex.current, index);
      const end = Math.max(lastClickedIndex.current, index);
      setSelected((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          next.add(tasks[i].id);
        }
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      });
    }
    lastClickedIndex.current = index;
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
    <div className="flex flex-col gap-2 h-full min-h-0">
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2 backdrop-blur">
          <span className="text-sm font-medium">
            {selected.size} task{selected.size > 1 ? "s" : ""} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCopiedRows(Array.from(selected));
              setCopiedCell(null);
            }}
            disabled={isPending}
          >
            <Copy className="mr-1 h-3 w-3" />
            Copy
          </Button>
          {(copiedRows.length > 0 || copiedCell) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (copiedCell && selected.size > 0) {
                  startTransition(async () => {
                    await bulkUpdateField(Array.from(selected), copiedCell.field, copiedCell.value);
                  });
                } else if (copiedRows.length > 0) {
                  startTransition(async () => {
                    await duplicateTasks(copiedRows);
                    setCopiedRows([]);
                  });
                }
              }}
              disabled={isPending}
            >
              <Clipboard className="mr-1 h-3 w-3" />
              {copiedCell ? `Paste ${copiedCell.field}` : `Paste ${copiedRows.length} row${copiedRows.length > 1 ? "s" : ""}`}
            </Button>
          )}
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
          {copiedRows.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {copiedRows.length} row{copiedRows.length > 1 ? "s" : ""} copied
            </span>
          )}
          {copiedCell && (
            <span className="text-xs text-muted-foreground ml-auto">
              Cell copied: {copiedCell.field}
            </span>
          )}
        </div>
      )}
      <div className="rounded-lg border overflow-auto flex-1 min-h-0">
        <Table style={{ width: `${totalWidth}px`, tableLayout: "fixed" }}>
          <TableHeader>
            <TableRow>
              {defaultColumns.map((col, i) => (
                <TableHead
                  key={col.key}
                  className="sticky top-0 z-20 bg-background relative text-xs whitespace-nowrap border-b"
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
            {tasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                selected={selected.has(task.id)}
                onSelect={(checked, shiftKey) => toggleOne(index, task.id, checked, shiftKey)}
                clientOptions={clientOptions}
                categoryMap={categoryMap}
                categoryOptions={categoryOptions}
                onCopyCell={(cell) => { setCopiedCell(cell); setCopiedRows([]); }}
                isHighlighted={activeHighlightId === task.id}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
