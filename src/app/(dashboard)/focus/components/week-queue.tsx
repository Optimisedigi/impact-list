import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";
import { formatDateShort } from "@/lib/time-utils";
import { Zap } from "lucide-react";

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
            {tasks.map((task) => {
              const cat = CATEGORIES[task.category as CategoryKey];
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate text-sm">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
