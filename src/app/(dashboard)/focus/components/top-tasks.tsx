"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";
import { Zap } from "lucide-react";

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
      {tasks.map((task, i) => {
        const cat = CATEGORIES[task.category as CategoryKey];
        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass-strong relative overflow-hidden">
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
                  {task.leverageScore && (
                    <div className="flex items-center gap-1 text-sm font-bold text-yellow-400">
                      <Zap className="h-3.5 w-3.5" />
                      {task.leverageScore}
                    </div>
                  )}
                </div>
                <CardTitle className="text-base leading-tight">{task.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {task.sequenceReason && (
                  <p className="text-xs text-muted-foreground italic">
                    {task.sequenceReason}
                  </p>
                )}
                {task.toComplete && (
                  <p className="mt-2 text-sm text-foreground/80">
                    Next: {task.toComplete}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
