"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";
import { Zap, X, Check } from "lucide-react";
import { updateTaskField } from "@/server/actions/tasks";
import { dismissFromFocus } from "@/server/actions/tasks";
import Link from "next/link";

function TaskCard({ task, index }: { task: Task; index: number }) {
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

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isPending ? 0.4 : 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="glass-strong relative overflow-hidden group">
        <div
          className="absolute left-0 top-0 h-1 w-full"
          style={{ backgroundColor: cat.color }}
        />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className="border-0 text-xs"
              style={{
                backgroundColor: `color-mix(in oklch, ${cat.color} 20%, transparent)`,
                color: cat.color,
              }}
            >
              {cat.label}
            </Badge>
            <div className="flex items-center gap-0.5">
              {task.leverageScore && (
                <div className="flex items-center gap-1 text-sm font-bold text-yellow-400">
                  <Zap className="h-3.5 w-3.5" />
                  {task.leverageScore}
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
                onClick={handleDismiss}
                disabled={isPending}
                title="Remove from focus"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <CardTitle className="text-base leading-tight">
            <Link href={`/tasks?highlight=${task.id}`} className="hover:underline">
              {task.title}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {task.sequenceReason && (
            <p className="text-xs text-muted-foreground italic">
              {task.sequenceReason}
            </p>
          )}
          {confirming ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mark as done?</span>
              <Button size="sm" variant="default" className="h-6 px-2 text-xs" onClick={handleMarkDone} disabled={isPending}>
                Yes
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setConfirming(false)}>
                No
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-2">
              {task.toComplete && (
                <p className="text-sm text-foreground/80">
                  Next: {task.toComplete}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-green-400 ml-auto"
                onClick={() => setConfirming(true)}
              >
                <Check className="h-3 w-3 mr-1" />
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function TopTasks({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        No tasks to focus on. Add tasks with leverage scores.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tasks.map((task, i) => (
        <TaskCard key={task.id} task={task} index={i} />
      ))}
    </div>
  );
}
