"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { CategoryTarget } from "@/types";

type AllocationData = { category: string; totalHours: number }[];
type PeriodKey = "this_week" | "last_week" | "this_month" | "last_month";

export function TimeAllocationTracker({
  initialData,
  targets,
  fetchAllocation,
}: {
  initialData: AllocationData;
  targets: CategoryTarget[];
  fetchAllocation: (period: PeriodKey) => Promise<AllocationData>;
}) {
  const [period, setPeriod] = useState<PeriodKey>("this_week");
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (period === "this_week") {
      setData(initialData);
      return;
    }
    startTransition(async () => {
      const result = await fetchAllocation(period);
      setData(result);
    });
  }, [period, initialData, fetchAllocation]);

  const totalHours = data.reduce((sum, d) => sum + d.totalHours, 0);
  const targetMap = Object.fromEntries(targets.map((t) => [t.category, t.targetPercentage]));

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Time Allocation</CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <TabsList className="h-7">
              <TabsTrigger value="this_week" className="text-xs px-2 py-1">This Week</TabsTrigger>
              <TabsTrigger value="last_week" className="text-xs px-2 py-1">Last Week</TabsTrigger>
              <TabsTrigger value="this_month" className="text-xs px-2 py-1">This Month</TabsTrigger>
              <TabsTrigger value="last_month" className="text-xs px-2 py-1">Last Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className={`space-y-3 ${isPending ? "opacity-60" : ""}`}>
        {totalHours === 0 ? (
          <p className="text-sm text-muted-foreground">No time logged for this period.</p>
        ) : (
          Object.entries(DEFAULT_CATEGORIES).map(([key, cat]) => {
            const entry = data.find((d) => d.category === key);
            const hours = entry?.totalHours ?? 0;
            const actual = totalHours > 0 ? (hours / totalHours) * 100 : 0;
            const target = targetMap[key] ?? 0;
            const diff = Math.abs(actual - target);
            const barColor =
              diff <= 5 ? "bg-green-500" : diff <= 10 ? "bg-yellow-500" : "bg-red-500";

            return (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span style={{ color: cat.color }}>{cat.label}</span>
                  <span className="text-muted-foreground">
                    {hours.toFixed(1)}h ({actual.toFixed(0)}%) / target {target}%
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(actual, 100)}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-0.5 bg-foreground/40"
                    style={{ left: `${target}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
        {totalHours > 0 && (
          <p className="text-xs text-muted-foreground text-right">{totalHours.toFixed(1)}h total</p>
        )}
      </CardContent>
    </Card>
  );
}
