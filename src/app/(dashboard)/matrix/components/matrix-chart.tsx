"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";

export function MatrixChart({ tasks }: { tasks: Task[] }) {
  const data = tasks
    .filter((t) => t.status !== "done")
    .map((t) => ({
      x: t.estimatedHours ? 11 - Math.min(t.estimatedHours, 10) : 5, // invert: low effort = high x
      y: t.leverageScore ?? 5,
      z: Math.max((t.leverageScore ?? 3) * 8, 20),
      name: t.title,
      category: t.category,
      id: t.id,
      priorityScore: t.priorityScore,
      leverageScore: t.leverageScore,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        No active tasks with scores. Run AI Scoring first.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={500}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.05)" />
        <XAxis
          type="number"
          dataKey="x"
          domain={[0, 11]}
          name="Low Effort →"
          label={{ value: "← High Effort    Low Effort →", position: "bottom", fill: "hsl(0 0% 100% / 0.4)", fontSize: 12 }}
          tick={{ fill: "hsl(0 0% 100% / 0.4)", fontSize: 11 }}
          tickCount={6}
        />
        <YAxis
          type="number"
          dataKey="y"
          domain={[0, 11]}
          name="Impact"
          label={{ value: "Impact →", angle: -90, position: "insideLeft", fill: "hsl(0 0% 100% / 0.4)", fontSize: 12 }}
          tick={{ fill: "hsl(0 0% 100% / 0.4)", fontSize: 11 }}
          tickCount={6}
        />
        <ReferenceLine x={5.5} stroke="hsl(0 0% 100% / 0.15)" strokeDasharray="5 5" />
        <ReferenceLine y={5.5} stroke="hsl(0 0% 100% / 0.15)" strokeDasharray="5 5" />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload;
            const cat = CATEGORIES[d.category as CategoryKey];
            return (
              <div className="rounded-lg border bg-popover p-3 text-sm shadow-lg">
                <p className="font-medium">{d.name}</p>
                <p style={{ color: cat.color }}>{cat.label}</p>
                <p className="text-muted-foreground">
                  Leverage: {d.leverageScore ?? "?"} | Priority: {d.priorityScore ?? "?"}
                </p>
              </div>
            );
          }}
        />
        <Scatter data={data}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={CATEGORIES[entry.category as CategoryKey]?.color ?? "#888"}
              fillOpacity={0.7}
              r={Math.sqrt(entry.z)}
            />
          ))}
        </Scatter>
        {/* Quadrant labels */}
        <text x="15%" y="15%" textAnchor="middle" fill="hsl(0 0% 100% / 0.15)" fontSize="14" fontWeight="bold">Major Projects</text>
        <text x="85%" y="15%" textAnchor="middle" fill="hsl(0 0% 100% / 0.15)" fontSize="14" fontWeight="bold">Quick Wins</text>
        <text x="15%" y="90%" textAnchor="middle" fill="hsl(0 0% 100% / 0.15)" fontSize="14" fontWeight="bold">Avoid</text>
        <text x="85%" y="90%" textAnchor="middle" fill="hsl(0 0% 100% / 0.15)" fontSize="14" fontWeight="bold">Fill-ins</text>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
