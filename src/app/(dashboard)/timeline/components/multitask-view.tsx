"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Columns3, Pencil, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotesEditor } from "@/app/(dashboard)/tasks/[id]/components/notes-editor";
import { cn } from "@/lib/utils";
import type { TimelineTask } from "@/server/queries/timeline";
import {
  addMultitaskColumn,
  removeMultitaskColumn,
  renameMultitaskColumn,
  type MultitaskColumn,
} from "@/server/actions/multitask-columns";

interface MultitaskViewProps {
  tasks: TimelineTask[];
  initialColumns: MultitaskColumn[];
}

type Column = MultitaskColumn;

export function MultitaskView({ tasks, initialColumns }: MultitaskViewProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);

  const selectedIds = useMemo(() => new Set(columns.map((c) => c.taskId)), [columns]);

  const availableTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((task) => !selectedIds.has(task.id))
      .filter((task) => (q ? task.title.toLowerCase().includes(q) : true))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [tasks, selectedIds, query]);

  const taskById = useMemo(() => {
    const map = new Map<number, TimelineTask>();
    for (const task of tasks) map.set(task.id, task);
    return map;
  }, [tasks]);

  function addColumn(task: TimelineTask): void {
    if (selectedIds.has(task.id)) return;
    setColumns((current) => [...current, { taskId: task.id, name: task.title }]);
    setQuery("");
    setPickerOpen(false);
    void addMultitaskColumn(task.id, task.title);
  }

  function removeColumn(taskId: number): void {
    setColumns((current) => current.filter((c) => c.taskId !== taskId));
    void removeMultitaskColumn(taskId);
  }

  function startRename(column: Column): void {
    committingRef.current = false;
    setEditingId(column.taskId);
    setEditValue(column.name);
    requestAnimationFrame(() => editInputRef.current?.select());
  }

  function commitRename(taskId: number): void {
    if (committingRef.current) return;
    committingRef.current = true;
    const trimmed = editValue.trim();
    const current = columns.find((c) => c.taskId === taskId);
    const resolvedName = trimmed || taskById.get(taskId)?.title || current?.name || editValue;
    setColumns((prev) =>
      prev.map((c) =>
        c.taskId === taskId ? { ...c, name: resolvedName } : c
      )
    );
    setEditingId(null);
    setEditValue("");
    void renameMultitaskColumn(taskId, resolvedName);
  }

  function cancelRename(): void {
    committingRef.current = true;
    setEditingId(null);
    setEditValue("");
  }

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[260px] justify-start text-muted-foreground">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add a task column
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[300px] p-0">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && availableTasks[0]) addColumn(availableTasks[0]);
                }}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto p-1">
              {availableTasks.length === 0 ? (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                  No matching tasks
                </p>
              ) : (
                availableTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => addColumn(task)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 opacity-0" />
                    <span className="truncate">{task.title}</span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
        {columns.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {columns.length} {columns.length === 1 ? "column" : "columns"}
          </span>
        )}
      </div>

      {columns.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div className="max-w-md space-y-3">
            <Columns3 className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Pull tasks in as columns</h2>
            <p className="text-sm text-muted-foreground">
              Search for a few tasks to see their notes side by side, so you can quickly jot down notes
              for multiple projects on one page.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto p-3">
          <div className="flex h-full gap-3">
            {columns.map((column) => {
              const task = taskById.get(column.taskId);
              if (!task) return null;
              const isEditing = editingId === column.taskId;
              return (
                <div
                  key={column.taskId}
                  className="flex h-full min-h-0 w-[360px] shrink-0 flex-col"
                >
                  <div className="flex items-center gap-1 pb-2">
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitRename(column.taskId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(column.taskId);
                          if (e.key === "Escape") cancelRename();
                        }}
                        className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-sm font-semibold outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startRename(column)}
                          className={cn(
                            "group flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left",
                            "hover:bg-accent hover:text-accent-foreground"
                          )}
                          title="Rename column"
                        >
                          <span className="truncate text-sm font-semibold">{column.name}</span>
                          <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => removeColumn(column.taskId)}
                          title="Remove column"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <NotesEditor taskId={task.id} initialContent={task.notes} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
