import {
  getTimeAllocationByPeriod,
  getTopTasksByLeverage,
  getOverdueTasks,
  getThisWeekTasks,
} from "@/server/queries/analytics";
import { getActiveGoals } from "@/server/queries/growth-phases";
import { generateRecurringTasks } from "@/server/actions/recurring-tasks";
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
  await generateRecurringTasks({ skipRevalidate: true });
  const [topTasks, overdueTasks, weekTasks, allocation, { goal90 }, allTasks, targets] =
    await Promise.all([
      getTopTasksByLeverage(3),
      getOverdueTasks(),
      getThisWeekTasks(),
      getTimeAllocationByPeriod("this_month"),
      getActiveGoals(),
      getAllTasks(),
      db.select().from(categoryTargets),
    ]);

  const overdueIds = new Set(overdueTasks.map((t) => t.id));
  const topIds = new Set(topTasks.map((t) => t.id));
  const topAndWeekIds = new Set([...topTasks.map((t) => t.id), ...weekTasks.map((t) => t.id)]);
  const standaloneOverdue = overdueTasks.filter((t) => !topAndWeekIds.has(t.id));
  const filteredWeekTasks = weekTasks.filter((t) => !topIds.has(t.id));

  return (
    <div className="space-y-4 md:space-y-6 min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-2xl font-bold tracking-tight">Focus Board</h1>
          <p className="text-sm text-muted-foreground hidden md:block">Your daily command center. Work on what matters most.</p>
        </div>
        <div className="hidden md:block">
          <ScoreButton />
        </div>
      </div>

      <OverdueSection tasks={standaloneOverdue} />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Priority</h2>
        <TopTasks tasks={topTasks} overdueIds={overdueIds} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="order-2 md:order-1 space-y-4">
          <PhaseProgressRing phase={goal90} tasks={allTasks} />
          <TimeAllocationTracker
            initialData={allocation}
            targets={targets}
            fetchAllocation={fetchAllocation}
          />
        </div>
        <div className="order-1 md:order-2">
          <WeekQueue tasks={filteredWeekTasks} overdueIds={overdueIds} />
        </div>
      </div>
    </div>
  );
}
