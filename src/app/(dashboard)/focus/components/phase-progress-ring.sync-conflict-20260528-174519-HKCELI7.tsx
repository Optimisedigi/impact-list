import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GrowthPhase, Task } from "@/types";

export function PhaseProgressRing({
  phase,
  tasks,
}: {
  phase: GrowthPhase | null;
  tasks: Task[];
}) {
  if (!phase) {
    return (
      <Card className="glass">
        <CardContent className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">No active 90-day goal set.</p>
        </CardContent>
      </Card>
    );
  }

  // Count tasks with high leverage (>=7) as goal-aligned, since they directly drive the 90-day goal
  const goalTasks = tasks.filter(
    (t) => t.status !== "done" && (t.leverageScore ?? 0) >= 7
  );
  const allScoredTasks = tasks.filter(
    (t) => t.leverageScore != null
  );
  const doneScoredTasks = allScoredTasks.filter((t) => t.status === "done");
  const doneGoalTasks = tasks.filter(
    (t) => t.status === "done" && (t.leverageScore ?? 0) >= 7
  );
  const totalGoal = goalTasks.length + doneGoalTasks.length;
  const done = doneGoalTasks.length;
  const pct = totalGoal > 0 ? (done / totalGoal) * 100 : 0;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Card className="glass py-2 gap-1">
      <CardHeader className="px-4 py-0">
        <CardTitle className="text-base">90-Day Goal Progress</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-3 px-4 pb-1 pt-0">
        <svg width="80" height="80" viewBox="0 0 100 100" className="shrink-0">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className="transition-all duration-500"
          />
          <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-sm font-bold" fontSize="16">
            {Math.round(pct)}%
          </text>
        </svg>
        <div className="min-w-0">
          <p className="font-medium truncate">{phase.name}</p>
          <p className="text-sm text-muted-foreground">
            {done}/{totalGoal} high-leverage tasks done
          </p>
          {phase.focusAreas && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{phase.focusAreas}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
