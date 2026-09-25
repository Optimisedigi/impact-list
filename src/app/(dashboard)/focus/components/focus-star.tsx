"use client";

import { useOptimistic, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isOnFocusBoard } from "@/lib/focus-utils";
import { dismissFromFocus, starForFocus } from "@/server/actions/tasks";
import type { Task } from "@/types";

/**
 * Focus board star: filled while the task is on the board. Clicking an empty
 * star adds the task to the board (restoring it if it was removed); clicking a
 * filled star removes it again.
 */
export function FocusStar({ task, className }: { task: Task; className?: string }) {
  const [isPending, startTransition] = useTransition();
  const [starred, setStarred] = useOptimistic(isOnFocusBoard(task), (_prev, next: boolean) => next);

  function toggleStar() {
    startTransition(async () => {
      setStarred(!starred);
      if (starred) {
        await dismissFromFocus(task.id);
      } else {
        await starForFocus(task.id);
      }
    });
  }

  const label = starred ? "Remove from Focus board" : "Add to Focus board";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-6 w-6 shrink-0",
        starred
          ? "text-yellow-400 hover:text-yellow-500"
          : "text-muted-foreground hover:text-yellow-400",
        className
      )}
      onClick={toggleStar}
      disabled={isPending}
      title={label}
      aria-label={label}
    >
      <Star className={cn("h-3.5 w-3.5", starred && "fill-current")} />
    </Button>
  );
}
