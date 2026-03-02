"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { CategoryTarget } from "@/types";

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(240 10% 12%)",
    border: "1px solid hsl(0 0% 100% / 0.1)",
    borderRadius: "8px",
    fontSize: "12px",
  },
};

export function AllocationTrend({ data, targets }: { data: Record<string, unknown>[]; targets: CategoryTarget[] }) {
  const targetMap = Object.fromEntries(targets.map((t) => [t.category, t.targetPercentage]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly Time Allocation (12 weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.05)" />
            <XAxis dataKey="week" tick={{ fill: "hsl(0 0% 100% / 0.4)", fontSize: 11 }} />
            <YAxis tick={{ fill: "hsl(0 0% 100% / 0.4)", fontSize: 11 }} />
            <Tooltip {...chartTooltipStyle} />
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={cat.color}
                fill={cat.color}
                fillOpacity={0.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CategoryRadar({ allocation, targets }: {
  allocation: { category: string; totalHours: number }[];
  targets: CategoryTarget[];
}) {
  const totalHours = allocation.reduce((s, a) => s + a.totalHours, 0) || 1;
  const targetMap = Object.fromEntries(targets.map((t) => [t.category, t.targetPercentage]));

  const data = Object.entries(CATEGORIES).map(([key, cat]) => {
    const entry = allocation.find((a) => a.category === key);
    const actual = entry ? (entry.totalHours / totalHours) * 100 : 0;
    return {
      category: cat.label,
      actual: Math.round(actual),
      target: targetMap[key] ?? 0,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Category Radar (This Month)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid stroke="hsl(0 0% 100% / 0.1)" />
            <PolarAngleAxis dataKey="category" tick={{ fill: "hsl(0 0% 100% / 0.6)", fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fill: "hsl(0 0% 100% / 0.3)", fontSize: 10 }} />
            <Radar name="Actual" dataKey="actual" stroke="hsl(240 80% 65%)" fill="hsl(240 80% 65%)" fillOpacity={0.3} />
            <Radar name="Target" dataKey="target" stroke="hsl(0 0% 100% / 0.3)" fill="none" strokeDasharray="5 5" />
            <Tooltip {...chartTooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PhaseBurndown({ data }: { data: { date: string; remaining: number }[] }) {
  if (data.length <= 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phase Burndown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Not enough completed tasks to show burndown.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Phase Burndown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.05)" />
            <XAxis dataKey="date" tick={{ fill: "hsl(0 0% 100% / 0.4)", fontSize: 11 }} />
            <YAxis tick={{ fill: "hsl(0 0% 100% / 0.4)", fontSize: 11 }} />
            <Tooltip {...chartTooltipStyle} />
            <Line type="monotone" dataKey="remaining" stroke="hsl(240 80% 65%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function LeverageTrendChart({ data }: { data: { week: string; avgLeverage: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Completed Task Leverage Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.05)" />
            <XAxis dataKey="week" tick={{ fill: "hsl(0 0% 100% / 0.4)", fontSize: 11 }} />
            <YAxis domain={[0, 10]} tick={{ fill: "hsl(0 0% 100% / 0.4)", fontSize: 11 }} />
            <Tooltip {...chartTooltipStyle} />
            <Line type="monotone" dataKey="avgLeverage" stroke="hsl(50 100% 60%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CompletionHeatmap({ data }: { data: { date: string; count: number }[] }) {
  // Simple bar chart as a lightweight alternative to calendar heatmap
  const last30 = data.slice(-30);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Task Completions</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last30}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.05)" />
              <XAxis dataKey="date" tick={{ fill: "hsl(0 0% 100% / 0.4)", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "hsl(0 0% 100% / 0.4)", fontSize: 11 }} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="count" fill="hsl(150 60% 50%)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
