"use client";

import { useRouter } from "next/navigation";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";
import { daysLeft } from "@/lib/time-utils";

interface TreemapItem {
  name: string;
  size: number;
  category: string;
  urgency: number;
  fill: string;
  leverageScore: number;
  priorityScore: number | null;
  taskId: number;
  [key: string]: unknown;
}

// Simple word wrap: split text into lines that fit within maxWidth
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length + word.length + 1 <= maxCharsPerLine) {
      current = current ? current + " " + word : word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function CustomContent(props: Record<string, unknown>) {
  const { x, y, width, height, name, fill, urgency, leverageScore } = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
    fill: string;
    urgency: number;
    leverageScore: number;
  };

  if (width < 4 || height < 4) return null;

  const lev = leverageScore ?? 1;
  // Higher leverage = more prominent: brighter fill, bolder border
  const opacity = 0.35 + (lev / 10) * 0.55; // 0.35 for low, 0.9 for high
  const strokeOpacity = 0.2 + (lev / 10) * 0.5;
  const strokeW = lev >= 7 ? 2 : 1;

  // Determine how much text we can show
  const padding = 8;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  // Larger font for bigger (high-leverage) rectangles
  const fontSize = Math.min(16, Math.max(9, Math.min(width, height) / 8));
  const lineHeight = fontSize * 1.3;
  const charsPerLine = Math.floor(innerWidth / (fontSize * 0.55));
  const maxLines = Math.floor(innerHeight / lineHeight);
  const showText = charsPerLine >= 3 && maxLines >= 1;

  let lines: string[] = [];
  if (showText) {
    lines = wrapText(name, charsPerLine).slice(0, maxLines);
    // Truncate last line if we cut off
    if (lines.length === maxLines && wrapText(name, charsPerLine).length > maxLines) {
      const last = lines[lines.length - 1];
      if (last.length > 3) {
        lines[lines.length - 1] = last.slice(0, last.length - 2) + "…";
      }
    }
  }

  // Show leverage badge in large enough rectangles
  const showBadge = width > 60 && height > 40 && lev >= 5;

  const textBlockHeight = lines.length * lineHeight + (showBadge ? fontSize + 4 : 0);
  const textStartY = y + height / 2 - textBlockHeight / 2 + fontSize / 2;

  return (
    <g style={{ cursor: "pointer" }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={opacity}
        stroke={fill}
        strokeWidth={strokeW}
        strokeOpacity={strokeOpacity}
        rx={3}
      />
      {showText && lines.map((line, i) => (
        <text
          key={i}
          x={x + padding}
          y={textStartY + i * lineHeight}
          fill="white"
          fontSize={fontSize}
          fontWeight={lev >= 7 ? "700" : "500"}
          fillOpacity={0.6 + (lev / 10) * 0.4}
          style={{ pointerEvents: "none" }}
        >
          {line}
        </text>
      ))}
      {showBadge && (
        <text
          x={x + padding}
          y={textStartY + lines.length * lineHeight + 4}
          fill="hsl(50 100% 70%)"
          fontSize={fontSize * 0.75}
          fontWeight="700"
          fillOpacity={0.8}
          style={{ pointerEvents: "none" }}
        >
          ⚡ {lev}/10
        </text>
      )}
    </g>
  );
}

export function LeverageTreemap({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
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
    const cat = DEFAULT_CATEGORIES[t.category as CategoryKey];
    const lev = t.leverageScore ?? 1;
    // Exponential sizing: high leverage dominates area dramatically
    // leverage 1 → 1, leverage 5 → 25, leverage 10 → 100
    const size = lev * lev;
    return {
      name: t.title,
      size,
      category: t.category,
      urgency,
      fill: cat?.color ?? "#888",
      leverageScore: lev,
      priorityScore: t.priorityScore,
      taskId: t.id,
    };
  });

  // Legend from categories in use
  const usedCategories = [...new Set(data.map((d) => d.category))];
  const legendItems = usedCategories.map((key) => {
    const cat = DEFAULT_CATEGORIES[key as CategoryKey];
    return { key, label: cat?.label ?? key, color: cat?.color ?? "#888" };
  });

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-2 shrink-0">
        {legendItems.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color, opacity: 0.8 }} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
          <span>Larger area = higher leverage</span>
          <span>Brighter = more urgent</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          aspectRatio={4 / 3}
          content={<CustomContent />}
          onClick={(entry: unknown) => { const e = entry as { taskId?: number }; if (e?.taskId) router.push(`/tasks?highlight=${e.taskId}`); }}
        >
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as TreemapItem;
              const cat = DEFAULT_CATEGORIES[d.category as CategoryKey];
              return (
                <div className="rounded-lg border bg-popover p-3 text-sm shadow-lg max-w-xs">
                  <p className="font-medium">{d.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat?.color }} />
                    <span style={{ color: cat?.color }}>{cat?.label}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground space-y-0.5">
                    <p>Leverage: {d.leverageScore} / 10</p>
                    <p>Priority: {d.priorityScore ?? "—"} / 10</p>
                  </div>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
