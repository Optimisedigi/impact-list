import {
  getTimeAllocationByPeriod,
  getTopTasksByLeverage,
  getOverdueTasks,
  getThisWeekTasks,
} from "@/server/queries/analytics";
import { getActivePhase } from "@/server/queries/growth-phases";
import { getAllTasks } from "@/server/queries/tasks";
import { db } from "@/db";
import { categoryTargets } from "@/db/schema";
import { TopTasks } from "./components/top-tasks";
import { TimeAllocationTracker } from "./components/time-allocation-tracker";
import { OverdueSection } from "./components/overdue-section";
import { WeekQueue } from "./components/week-queue";
import { PhaseProgressRing } from "./components/phase-progress-ring";
import type { PeriodKey } from "@/server/queries/analytics";
import { ScoreButton } from "@/components/ui/score-button";

async function fetchAllocation(period: PeriodKey) {
  "use server";
  return getTimeAllocationByPeriod(period);
}

export default async function FocusPage() {
  const [topTasks, overdueTasks, weekTasks, allocation, phase, allTasks, targets] =
    await Promise.all([
      getTopTasksByLeverage(3),
      getOverdueTasks(),
      getThisWeekTasks(),
      getTimeAllocationByPeriod("this_week"),
      getActivePhase(),
      getAllTasks(),
      db.select().from(categoryTargets),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Focus Board</h1>
          <p className="text-sm text-muted-foreground">Your daily command center. Work on what matters most.</p>
        </div>
        <ScoreButton />
      </div>

      <OverdueSection tasks={overdueTasks} />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Priority</h2>
        <TopTasks tasks={topTasks} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TimeAllocationTracker
          initialData={allocation}
          targets={targets}
          fetchAllocation={fetchAllocation}
        />
        <div className="space-y-4">
          <PhaseProgressRing phase={phase} tasks={allTasks} />
          <WeekQueue tasks={weekTasks} />
        </div>
      </div>
    </div>
  );
}
