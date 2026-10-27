import {
  getTimeAllocationByPeriod,
  getTopTasksByLeverage,
  getOverdueTasks,
  getThisWeekTasks,
  getDismissedFocusTasks,
} from "@/server/queries/analytics";
import { getWeeklyHoursHistory } from "@/server/queries/daily-logs";
import { getBusinessContext } from "@/server/actions/business-context";
import { RecentWeeksHoursChart } from "@/app/(dashboard)/analytics/components/hours-charts";
import { getActiveGoals } from "@/server/queries/growth-phases";
import { generateRecurringTasks } from "@/server/actions/recurring-tasks";
import { getScoredTaskSummaries } from "@/server/queries/tasks";
import { db } from "@/db";
import { categoryTargets } from "@/db/schema";
import { TopTasks } from "./components/top-tasks";
import { TimeAllocationTracker } from "./components/time-allocation-tracker";
import { WeekQueue } from "./components/week-queue";
import { RemovedFromFocus } from "./components/removed-from-focus";
import { PhaseProgressRing } from "./components/phase-progress-ring";
import { FocusDndProvider } from "./components/focus-dnd-provider";
import type { PeriodKey } from "@/server/queries/analytics";
import { ScoreButton } from "@/components/ui/score-button";

async function fetchAllocation(period: PeriodKey) {
  "use server";
  return getTimeAllocationByPeriod(period);
}

export default async function FocusPage() {
  const [topTasks, overdueTasks, weekTasks, allocation, { goal90 }, scoredTasks, targets, removedTasks, weeklyHours] =
    await Promise.all([
      getTopTasksByLeverage(3),
      getOverdueTasks(),
      getThisWeekTasks(),
      getTimeAllocationByPeriod("this_month"),
      getActiveGoals(),
      getScoredTaskSummaries(),
      db.select().from(categoryTargets),
      getDismissedFocusTasks(),
      getBusinessContext().then((ctx) => getWeeklyHoursHistory(ctx?.startDate || null, 4)),
      generateRecurringTasks({ skipRevalidate: true }),
    ]);

  const overdueIds = new Set(overdueTasks.map((t) => t.id));
  const topIds = new Set(topTasks.map((t) => t.id));
  const topAndWeekIds = new Set([...topTasks.map((t) => t.id), ...weekTasks.map((t) => t.id)]);
  // Dismissed tasks live in the "Removed from focus" section (with their restore
  // star) instead of the Overdue strip.
  const standaloneOverdue = overdueTasks.filter((t) => !topAndWeekIds.has(t.id) && !t.dismissedFromFocus);
  const focusWeekTasks = weekTasks.filter((t) => !topIds.has(t.id));
  const filteredWeekTasks = focusWeekTasks.filter((t) => !t.unnumberedInFocus);
  const unnumberedWeekTasks = focusWeekTasks.filter((t) => t.unnumberedInFocus);

  return (
    <div className="space-y-3 md:space-y-6 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg md:text-2xl font-bold tracking-tight">Focus Board</h1>
          <p className="text-sm text-muted-foreground hidden md:block">Your daily command center. Work on what matters most.</p>
        </div>
        {/* Mobile only: Top Priority label shares the heading line. */}
        <h2 className="md:hidden shrink-0 text-sm font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
          Top Priority
        </h2>
        <div className="hidden md:block">
          <ScoreButton />
        </div>
      </div>

      <FocusDndProvider>
        <section aria-label="Top Priority">
          <h2 className="hidden md:block mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Priority</h2>
          <TopTasks tasks={topTasks} overdueIds={overdueIds} queueTaskIds={filteredWeekTasks.map((t) => t.id)} />
        </section>

        {/* DOM order is the mobile order (This Week, Weekly Hours, goal, allocation).
            On desktop the queue spans the right column and the rest stack on the left;
            the last left row is 1fr so a tall queue doesn't open gaps between cards. */}
        <div className="grid items-start gap-3 md:grid-cols-2 md:grid-rows-[auto_auto_1fr] md:gap-4">
          <div className="min-w-0 md:col-start-2 md:row-span-3 md:row-start-1">
            <WeekQueue tasks={filteredWeekTasks} overdueIds={overdueIds} overdueTasks={standaloneOverdue} topTaskIds={topTasks.map((t) => t.id)} unnumberedTasks={unnumberedWeekTasks} />
          </div>
          <div className="min-w-0 md:col-start-1 md:row-start-3">
            <RecentWeeksHoursChart data={weeklyHours} />
          </div>
          <div className="min-w-0 md:col-start-1 md:row-start-1">
            <PhaseProgressRing phase={goal90} tasks={scoredTasks} />
          </div>
          <div className="min-w-0 md:col-start-1 md:row-start-2">
            <TimeAllocationTracker
              initialData={allocation}
              targets={targets}
              fetchAllocation={fetchAllocation}
            />
          </div>
        </div>
      </FocusDndProvider>

      <RemovedFromFocus tasks={removedTasks} />
    </div>
  );
}
