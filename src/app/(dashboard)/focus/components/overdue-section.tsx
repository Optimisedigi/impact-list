import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { daysLeft, formatDateShort } from "@/lib/time-utils";
import { CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";
import { AlertTriangle } from "lucide-react";

export function OverdueSection({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium text-red-400">
        <AlertTriangle className="h-4 w-4" />
        Overdue ({tasks.length})
      </h3>
      <div className="grid gap-2 md:grid-cols-2">
        {tasks.map((task) => {
          const days = daysLeft(task.deadline);
          const cat = CATEGORIES[task.category as CategoryKey];
          return (
            <Card key={task.id} className="glow-red border-red-500/20">
              <CardContent className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <div className="mt-1 flex items-center gap-2">
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
                    {task.deadline && (
                      <span className="text-xs text-red-400">
                        {formatDateShort(task.deadline)} ({days}d)
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
