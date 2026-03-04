"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";
import { formatDateShort } from "@/lib/time-utils";
import { Zap, Repeat, X, Check } from "lucide-react";
import { updateTaskField, dismissFromFocus } from "@/server/actions/tasks";
import Link from "next/link";

function QueueItem({ task }: { task: Task }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const cat = DEFAULT_CATEGORIES[task.category as CategoryKey];

  function handleDismiss() {
    startTransition(async () => {
      await dismissFromFocus(task.id);
    });
  }

  function handleMarkDone() {
    startTransition(async () => {
      await updateTaskField(task.id, "status", "done");
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
        <span className="truncate text-sm">{task.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Mark as done?</span>
          <Button size="sm" variant="default" className="h-6 px-2 text-xs" onClick={handleMarkDone} disabled={isPending}>
            Yes
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setConfirming(false)}>
            No
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between rounded-md border border-border/50 px-3 py-2 group ${isPending ? "opacity-40" : ""}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: cat.color }}
        />
        <Link href={`/tasks?highlight=${task.id}`} className="truncate text-sm hover:underline">
          {task.title}
        </Link>
        {task.recurringTaskId && (
          <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {task.deadline && (
          <span className="text-xs text-muted-foreground">
            {formatDateShort(task.deadline)}
          </span>
        )}
        {task.leverageScore && (
          <Badge variant="outline" className="border-0 text-xs text-yellow-400">
            <Zap className="mr-0.5 h-3 w-3" />
            {task.leverageScore}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-green-400"
          onClick={() => setConfirming(true)}
          title="Mark as done"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
          onClick={handleDismiss}
          disabled={isPending}
          title="Remove from focus"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function WeekQueue({ tasks }: { tasks: Task[] }) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">This Week</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks due this week.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <QueueItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
