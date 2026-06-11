import { db } from "@/db";
import { categoryTargets } from "@/db/schema";
import { getTimeAllocationByPeriod } from "@/server/queries/analytics";
import { getActivePhase } from "@/server/queries/growth-phases";
import { getBusinessContext } from "@/server/actions/business-context";
import { getAllCategories } from "@/server/actions/categories";
import { buildCategoryMap, buildCategoryOptions } from "@/lib/constants";
import {
  getWeeklyAllocationTrend,
  getCompletionsByDay,
  getCategoryPercentageOverTime,
  getPhaseBurndown,
  getLeverageTrend,
  getRecentlyCompletedTasks,
} from "@/server/queries/analytics-extended";
import {
  getDailyHoursStats,
  getDailyHoursByWeek,
  getDailyHoursByMonth,
  getDailyLogsByDateRange,
  getRecentDailyLogs,
  getMondayOf,
} from "@/server/queries/daily-logs";
import {
  AllocationTrend,
  CategoryPercentageChart,
  CategoryRadar,
  PhaseBurndown,
  LeverageTrendChart,
  CompletionHeatmap,
  CompletedTasksList,
} from "./components/analytics-charts";
import { HoursStats } from "./components/hours-stats";
import { WeeklyHoursChart, MonthlyHoursChart } from "./components/hours-charts";
import { DailyLogList } from "./components/daily-log-list";

function localISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sumHours(logs: { hours: number }[]): number {
  return logs.reduce((acc, l) => acc + l.hours, 0);
}

export default async function AnalyticsPage() {
  const bizContext = await getBusinessContext();
  const startDate = bizContext?.startDate || null;

  const now = new Date();
  const monday = getMondayOf(now);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    targets,
    weeklyTrend,
    completions,
    categoryPct,
    leverageTrend,
    monthAllocation,
    phase,
    completedTasks,
    dbCategories,
    hoursStats,
    hoursWeekly,
    hoursMonthly,
    weekLogs,
    monthLogs,
    recentLogs,
  ] = await Promise.all([
      db.select().from(categoryTargets),
      getWeeklyAllocationTrend(undefined, startDate),
      getCompletionsByDay(365),
      getCategoryPercentageOverTime(undefined, startDate),
      getLeverageTrend(undefined, startDate),
      getTimeAllocationByPeriod("this_month"),
      getActivePhase(),
      getRecentlyCompletedTasks(),
      getAllCategories(),
      getDailyHoursStats(),
      getDailyHoursByWeek(startDate),
      getDailyHoursByMonth(),
      getDailyLogsByDateRange(localISO(monday), localISO(sunday)),
      getDailyLogsByDateRange(localISO(monthStart), localISO(monthEnd)),
      getRecentDailyLogs(),
    ]);
  const categoryMap = buildCategoryMap(dbCategories);
  const categoryOptions = buildCategoryOptions(dbCategories);
  const hoursSinceDate = startDate || hoursStats.firstLogDate;

  const burndown = phase ? await getPhaseBurndown(phase.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Track your time allocation, completions, and leverage trends.</p>
      </div>

      <CategoryPercentageChart data={categoryPct} />

      <AllocationTrend data={weeklyTrend} targets={targets} />

      <div className="grid gap-4 md:grid-cols-2">
        <CategoryRadar allocation={monthAllocation} targets={targets} />
        <PhaseBurndown data={burndown} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CompletionHeatmap data={completions} />
        <LeverageTrendChart data={leverageTrend} />
      </div>

      <CompletedTasksList
        data={completedTasks}
        categoryOptions={categoryOptions}
        categoryMap={categoryMap}
      />

      <div className="space-y-4 pt-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Daily Hours</h2>
          <p className="text-sm text-muted-foreground">
            Daily totals of hours worked, separate from per-task time tracking. Log via the + button.
          </p>
        </div>

        <HoursStats
          totalHours={hoursStats.totalHours}
          thisWeekHours={sumHours(weekLogs)}
          thisMonthHours={sumHours(monthLogs)}
          avgPerLoggedDay={hoursStats.avgPerLoggedDay}
          loggedDays={hoursStats.loggedDays}
          sinceDate={hoursSinceDate}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <WeeklyHoursChart data={hoursWeekly} categoryOptions={categoryOptions} />
          <MonthlyHoursChart data={hoursMonthly} />
        </div>

        <DailyLogList logs={recentLogs} />
      </div>
    </div>
  );
}
