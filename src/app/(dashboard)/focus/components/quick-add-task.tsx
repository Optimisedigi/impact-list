"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { buildCategoryOptions } from "@/lib/constants";
import { createFocusTask } from "@/server/actions/tasks";
import type { Task } from "@/types";

const CATEGORY_OPTIONS = buildCategoryOptions();

export function QuickAddTask({ tasks }: { tasks: Task[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]?.value ?? "admin");
  const [position, setPosition] = useState(tasks.length);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Clamp in case the list shrank since the position was chosen
  const clampedPosition = Math.min(position, tasks.length);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function reset() {
    setTitle("");
    setPosition(tasks.length);
    setOpen(false);
  }

  function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed || isPending) return;
    startTransition(async () => {
      await createFocusTask({
        title: trimmed,
        category,
        position: clampedPosition,
        existingIds: tasks.map((t) => t.id),
      });
      reset();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md border border-dashed border-border/50 px-3 py-2 text-sm text-muted-foreground hover:border-border hover:text-foreground transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title…"
        disabled={isPending}
        className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") reset();
        }}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        disabled={isPending}
        className="rounded border border-border bg-background px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
        title="Category"
      >
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        value={clampedPosition}
        onChange={(e) => setPosition(Number(e.target.value))}
        disabled={isPending}
        className="max-w-36 rounded border border-border bg-background px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
        title="Position in list"
      >
        {tasks.length > 0 && <option value={0}>Top of list</option>}
        {tasks.map((t, i) => (
          <option key={t.id} value={i + 1}>
            After “{t.title.length > 20 ? `${t.title.slice(0, 20)}…` : t.title}”
          </option>
        ))}
        {tasks.length === 0 && <option value={0}>Only item</option>}
      </select>
      <Button size="sm" className="h-7 px-2 text-xs" onClick={handleAdd} disabled={isPending || !title.trim()}>
        Add
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={reset} disabled={isPending}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
