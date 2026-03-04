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
import { getBusinessContext } from "@/server/actions/business-context";
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
  const [topTasks, overdueTasks, weekTasks, allocation, { goal90 }, allTasks, targets, bizContext] =
    await Promise.all([
      getTopTasksByLeverage(3),
      getOverdueTasks(),
      getThisWeekTasks(),
      getTimeAllocationByPeriod("this_week"),
      getActiveGoals(),
      getAllTasks(),
      db.select().from(categoryTargets),
      getBusinessContext(),
    ]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const weekNumber = bizContext?.startDate
    ? Math.floor((new Date(todayStr + "T00:00:00").getTime() - new Date(bizContext.startDate + "T00:00:00").getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
    : null;

  const weekQuotes: ((w: number) => string)[] = [
    () => "Lessgoooo!",
    () => "Let's get it!",
    () => "Game on!",
    () => "Full send!",
    () => "Built different",
    () => "Main character energy",
    () => "Stackin' weeks",
    () => "Small steps, big moves",
    () => "Trust the process",
    (w) => `${w} weeks, 0 excuses`,
    () => "Consistency > intensity",
    (w) => `Level ${w} unlocked`,
    () => "What will you build today?",
    () => "Brick by brick",
    () => "1% better",
    () => "Embrace the suck",
    () => "Discipline equals freedom",
    () => "Run it back",
    () => "Time to cook",
  ];
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekQuote = weekNumber
    ? weekQuotes[dayOfYear % weekQuotes.length](weekNumber)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Focus Board</h1>
          <p className="text-sm text-muted-foreground">Your daily command center. Work on what matters most.</p>
        </div>
        <div className="flex items-center gap-4">
          {weekNumber && weekNumber > 0 && (
            <span className="mr-2 text-base font-medium text-primary">
              <span className="relative inline-block">
                <svg
                  className="pointer-events-none absolute -inset-x-3.5 -top-1 -bottom-3"
                  viewBox="0 0 120 44"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <ellipse
                    cx="60"
                    cy="22"
                    rx="56"
                    ry="18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    strokeLinecap="round"
                    transform="rotate(-2 60 22)"
                    opacity="0.6"
                  />
                </svg>
                Week {weekNumber}
              </span>
              {" "}since start — {weekQuote}
            </span>
          )}
          <ScoreButton />
        </div>
      </div>

      <OverdueSection tasks={overdueTasks} />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Priority</h2>
        <TopTasks tasks={topTasks} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <PhaseProgressRing phase={goal90} tasks={allTasks} />
          <TimeAllocationTracker
            initialData={allocation}
            targets={targets}
            fetchAllocation={fetchAllocation}
          />
        </div>
        <WeekQueue tasks={weekTasks} />
      </div>
    </div>
  );
}
