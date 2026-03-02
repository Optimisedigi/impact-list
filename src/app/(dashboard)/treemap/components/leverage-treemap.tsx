"use client";

import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";
import { daysLeft } from "@/lib/time-utils";

interface TreemapItem {
  name: string;
  size: number;
  category: string;
  urgency: number;
  fill: string;
}

function CustomContent(props: Record<string, unknown>) {
  const { x, y, width, height, name, fill } = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
    fill: string;
  };

  if (width < 40 || height < 30) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={0.7}
        stroke="hsl(0 0% 0% / 0.3)"
        strokeWidth={1}
        rx={4}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={Math.min(12, width / 8)}
        fontWeight="500"
      >
        {width > 80 ? name : name?.slice(0, 15) + (name?.length > 15 ? "..." : "")}
      </text>
    </g>
  );
}

export function LeverageTreemap({ tasks }: { tasks: Task[] }) {
  const activeTasks = tasks.filter((t) => t.status !== "done" && (t.leverageScore ?? 0) > 0);

  if (activeTasks.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        No active tasks with leverage scores. Run AI Scoring first.
      </div>
    );
  }

  const data: TreemapItem[] = activeTasks.map((t) => {
    const days = daysLeft(t.deadline);
    const urgency = days === null ? 0.5 : days <= 0 ? 1 : days <= 7 ? 0.8 : days <= 14 ? 0.6 : 0.4;
    const cat = CATEGORIES[t.category as CategoryKey];
    return {
      name: t.title,
      size: t.leverageScore ?? 1,
      category: t.category,
      urgency,
      fill: cat?.color ?? "#888",
    };
  });

  return (
    <ResponsiveContainer width="100%" height={500}>
      <Treemap
        data={data}
        dataKey="size"
        aspectRatio={4 / 3}
        content={<CustomContent />}
      >
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload;
            const cat = CATEGORIES[d.category as CategoryKey];
            return (
              <div className="rounded-lg border bg-popover p-3 text-sm shadow-lg">
                <p className="font-medium">{d.name}</p>
                <p style={{ color: cat?.color }}>{cat?.label}</p>
                <p className="text-muted-foreground">Leverage: {d.size}</p>
              </div>
            );
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
