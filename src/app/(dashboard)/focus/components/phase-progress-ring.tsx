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
          <p className="text-sm text-muted-foreground">No active growth phase set.</p>
        </CardContent>
      </Card>
    );
  }

  const phaseTasks = tasks.filter((t) => t.growthPhaseId === phase.id);
  const doneTasks = phaseTasks.filter((t) => t.status === "done");
  const total = phaseTasks.length;
  const done = doneTasks.length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Phase Progress</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <svg width="100" height="100" viewBox="0 0 100 100">
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
        <div>
          <p className="font-medium">{phase.name}</p>
          <p className="text-sm text-muted-foreground">
            {done}/{total} tasks done
          </p>
          {phase.focusAreas && (
            <p className="mt-1 text-xs text-muted-foreground">{phase.focusAreas}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
