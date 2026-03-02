import { db } from "@/db";
import { categoryTargets } from "@/db/schema";
import { getTimeAllocationByPeriod } from "@/server/queries/analytics";
import { getActivePhase } from "@/server/queries/growth-phases";
import {
  getWeeklyAllocationTrend,
  getCompletionsByDay,
  getPhaseBurndown,
  getLeverageTrend,
} from "@/server/queries/analytics-extended";
import {
  AllocationTrend,
  CategoryRadar,
  PhaseBurndown,
  LeverageTrendChart,
  CompletionHeatmap,
} from "./components/analytics-charts";

export default async function AnalyticsPage() {
  const [targets, weeklyTrend, completions, leverageTrend, monthAllocation, phase] =
    await Promise.all([
      db.select().from(categoryTargets),
      getWeeklyAllocationTrend(12),
      getCompletionsByDay(365),
      getLeverageTrend(12),
      getTimeAllocationByPeriod("this_month"),
      getActivePhase(),
    ]);

  const burndown = phase ? await getPhaseBurndown(phase.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Track your time allocation, completions, and leverage trends.</p>
      </div>

      <AllocationTrend data={weeklyTrend} targets={targets} />

      <div className="grid gap-4 md:grid-cols-2">
        <CategoryRadar allocation={monthAllocation} targets={targets} />
        <PhaseBurndown data={burndown} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CompletionHeatmap data={completions} />
        <LeverageTrendChart data={leverageTrend} />
      </div>
    </div>
  );
}
