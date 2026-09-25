import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateShort } from "@/lib/time-utils";
import type { Task } from "@/types";
import { FocusStar } from "./focus-star";

/** Tasks removed from the Focus board, each with a star to bring it back. */
export function RemovedFromFocus({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null;

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Removed from focus</CardTitle>
        <p className="text-xs text-muted-foreground">Star a task to bring it back to the board.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 px-3 py-2"
            >
              <FocusStar task={task} />
              <Link
                href={`/tasks?highlight=${task.id}`}
                className="min-w-0 flex-1 text-sm hover:underline break-words"
              >
                {task.title}
              </Link>
              {task.dismissedFromFocus && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  Removed {formatDateShort(task.dismissedFromFocus)}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
