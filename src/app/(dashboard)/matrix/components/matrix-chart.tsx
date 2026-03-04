"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from "recharts";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { Task } from "@/types";

interface BubbleData {
  x: number;
  y: number;
  rawX: number;
  rawY: number;
  radius: number;
  name: string;
  category: string;
  id: number;
  priorityScore: number | null;
  leverageScore: number | null;
  estimatedHours: number | null;
  hasHours: boolean;
}

// Progressive axis mapping: gaps increase as values grow (2, 3, 4... units of space).
// This compresses high values together and spreads low values apart,
// pulling bubbles toward the bottom-left so they don't all pile up top-right.
function progressiveScale(value: number, maxRaw: number): number {
  // Build cumulative positions: gap between tick n and n+1 = (2 + n) units
  // tick 0 = 0, tick 1 = 2, tick 2 = 5, tick 3 = 9, tick 4 = 14, ...
  const gaps: number[] = [];
  const positions: number[] = [0];
  for (let i = 0; i < maxRaw; i++) {
    const gap = 2 + i; // 2, 3, 4, 5, ...
    gaps.push(gap);
    positions.push(positions[i] + gap);
  }
  const totalRange = positions[maxRaw];

  // Interpolate for fractional values
  const floor = Math.floor(value);
  const ceil = Math.ceil(value);
  if (floor === ceil || ceil > maxRaw) {
    const idx = Math.min(Math.max(Math.round(value), 0), maxRaw);
    return positions[idx] / totalRange;
  }
  const low = positions[floor] / totalRange;
  const high = positions[ceil] / totalRange;
  const frac = value - floor;
  return low + frac * (high - low);
}

// Nudge overlapping bubbles apart until they just touch (no gap, no overlap).
// chartPx: approximate pixel size of the chart plot area so we can convert
// pixel radii into data-space distances accurately.
function resolveOverlaps(bubbles: BubbleData[], chartPx: number, maxIter = 40): BubbleData[] {
  const result = bubbles.map((b) => ({ ...b }));
  // Convert pixel radius to data-space: dataRange is 1.2 (domain -0.1 to 1.1)
  const dataRange = 1.2;
  const pxToData = dataRange / chartPx;

  for (let iter = 0; iter < maxIter; iter++) {
    let moved = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Allow edges to touch: use 90% of combined radii so bubbles sit snug
        const minDist = (a.radius + b.radius) * pxToData * 0.9;
        if (dist < minDist && dist > 0.0001) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  // Clamp: keep bubble centres inside [0.05, 0.95] so edges stay within chart
  for (const b of result) {
    b.x = Math.max(0.05, Math.min(0.95, b.x));
    b.y = Math.max(0.05, Math.min(0.95, b.y));
  }
  return result;
}

// Word wrap for bubble text
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

function BubbleShape(props: Record<string, unknown>) {
  const { cx, cy, payload } = props as { cx: number; cy: number; payload: BubbleData };
  const r = payload.radius;
  const lev = payload.leverageScore ?? 1;
  const cat = DEFAULT_CATEGORIES[payload.category as CategoryKey];
  const color = cat?.color ?? "#888";
  // Higher leverage = more visually prominent
  const fillOpacity = 0.35 + (lev / 10) * 0.5; // 0.35 → 0.85
  const strokeW = lev >= 8 ? 3 : 2;

  // Text fitting - scale font with bubble size
  const fontSize = Math.min(13, Math.max(8, r / 4.5));
  const charsPerLine = Math.max(3, Math.floor((r * 1.5) / (fontSize * 0.55)));
  const lineHeight = fontSize * 1.2;
  const maxLines = Math.max(1, Math.floor((r * 1.5) / lineHeight));
  const showText = r >= 18;

  let lines: string[] = [];
  if (showText) {
    const allLines = wrapText(payload.name, charsPerLine);
    lines = allLines.slice(0, maxLines);
    if (allLines.length > maxLines) {
      const last = lines[lines.length - 1];
      if (last.length > 3) lines[lines.length - 1] = last.slice(0, last.length - 2) + "…";
    }
  }

  const textBlockHeight = lines.length * lineHeight;
  const textStartY = cy - textBlockHeight / 2 + fontSize * 0.4;

  return (
    <g style={{ cursor: "pointer" }}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={fillOpacity}
        stroke={color}
        strokeWidth={strokeW}
        strokeOpacity={0.85}
      />
      {!payload.hasHours && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 3}
          fill="none"
          stroke="var(--color-muted-foreground)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}
      {showText && lines.map((line, i) => (
        <text
          key={i}
          x={cx}
          y={textStartY + i * lineHeight}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={fontSize}
          fontWeight={lev >= 7 ? "700" : "500"}
          style={{ pointerEvents: "none" }}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function MatrixChart({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const scoredTasks = tasks.filter(
    (t) => t.status !== "done" && t.leverageScore != null
  );

  const unscoredCount = tasks.filter(
    (t) => t.status !== "done" && t.leverageScore == null
  ).length;

  const filteredTasks = activeCategory
    ? scoredTasks.filter((t) => t.category === activeCategory)
    : scoredTasks;

  // Build initial data with progressive axis scaling
  const rawData: BubbleData[] = filteredTasks.map((t) => {
    const leverage = t.leverageScore!;
    const priority = t.priorityScore ?? 5;
    const hasHours = t.estimatedHours != null && t.estimatedHours > 0;

    // Raw effort value (1-10 scale, inverted: high effort = low x)
    let rawEffort: number;
    if (hasHours) {
      rawEffort = 11 - Math.min(t.estimatedHours!, 10);
    } else {
      rawEffort = 3 + (priority / 10) * 5;
    }

    // Progressive scale maps raw 0-10 into compressed space
    const x = progressiveScale(rawEffort, 10);
    const y = progressiveScale(leverage, 10);

    // Bubble size scales with impact: cubic curve so high-leverage bubbles dominate visually
    // leverage 1 ≈ 20px, leverage 5 ≈ 30px, leverage 9 ≈ 78px, leverage 10 = 100px
    const normalised = leverage / 10;
    const radius = 20 + Math.pow(normalised, 3) * 80;

    return {
      x,
      y,
      rawX: rawEffort,
      rawY: leverage,
      radius,
      name: t.title,
      category: t.category,
      id: t.id,
      priorityScore: t.priorityScore,
      leverageScore: t.leverageScore,
      estimatedHours: t.estimatedHours,
      hasHours,
    };
  });

  // Resolve overlapping bubbles (estimate ~700px as typical chart width)
  const data = resolveOverlaps(rawData, 700);

  if (data.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        No scored tasks to display. Run AI Scoring first.
        {unscoredCount > 0 && ` (${unscoredCount} unscored task${unscoredCount > 1 ? "s" : ""})`}
      </div>
    );
  }

  // Show all categories that exist in scored tasks (not just filtered)
  const allCategories = [...new Set(scoredTasks.map((t) => t.category))];
  const legendItems = allCategories.map((key) => {
    const cat = DEFAULT_CATEGORIES[key as CategoryKey];
    return { key, label: cat?.label ?? key, color: cat?.color ?? "#888" };
  });

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Legend - clickable for filtering */}
      <div className="flex flex-wrap items-center gap-2 px-2 shrink-0">
        {legendItems.map((item) => {
          const isActive = activeCategory === item.key;
          const isDimmed = activeCategory !== null && !isActive;
          return (
            <button
              key={item.key}
              onClick={() => setActiveCategory(isActive ? null : item.key)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all border ${
                isActive
                  ? "border-current font-medium"
                  : isDimmed
                    ? "border-transparent opacity-40 hover:opacity-70"
                    : "border-transparent hover:bg-muted"
              }`}
              style={{ color: isActive ? item.color : undefined }}
            >
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color, opacity: isDimmed ? 0.4 : 0.8 }}
              />
              <span className={isDimmed ? "text-muted-foreground" : "text-foreground"}>{item.label}</span>
            </button>
          );
        })}
        {activeCategory && (
          <button
            onClick={() => setActiveCategory(null)}
            className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
          >
            Show all
          </button>
        )}
        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
          <span>Bubble size = leverage score</span>
          <span className="flex items-center gap-1">
            <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" /></svg>
            No est. hours
          </span>
        </div>
        {unscoredCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {unscoredCount} unscored task{unscoredCount > 1 ? "s" : ""} hidden
          </span>
        )}
      </div>

      {/* Wide rectangle chart - fills available space */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 40, right: 50, bottom: 60, left: 65 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-0.1, 1.1]}
              ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => progressiveScale(v, 10))}
              tickFormatter={(v: number) => {
                // Find closest raw tick value
                const closest = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce((best, raw) => {
                  const mapped = progressiveScale(raw, 10);
                  return Math.abs(mapped - v) < Math.abs(progressiveScale(best, 10) - v) ? raw : best;
                }, 1);
                return `${11 - closest}h`;
              }}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            >
              <Label
                value="EFFORT"
                position="bottom"
                offset={30}
                style={{ fill: "var(--color-foreground)", fontSize: 14, fontWeight: 700 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              domain={[-0.1, 1.1]}
              ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => progressiveScale(v, 10))}
              tickFormatter={(v: number) => {
                const closest = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce((best, raw) => {
                  const mapped = progressiveScale(raw, 10);
                  return Math.abs(mapped - v) < Math.abs(progressiveScale(best, 10) - v) ? raw : best;
                }, 1);
                return `${closest}`;
              }}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            >
              <Label
                value="IMPACT"
                angle={-90}
                position="insideLeft"
                offset={-25}
                style={{ fill: "var(--color-foreground)", fontSize: 14, fontWeight: 700, textAnchor: "middle" }}
              />
            </YAxis>

            {/* Quadrant dividers at the midpoint (value 5.5) */}
            <ReferenceLine x={progressiveScale(5.5, 10)} stroke="var(--color-border)" strokeWidth={2} />
            <ReferenceLine y={progressiveScale(5.5, 10)} stroke="var(--color-border)" strokeWidth={2} />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as BubbleData;
                const cat = DEFAULT_CATEGORIES[d.category as CategoryKey];
                return (
                  <div className="rounded-lg border bg-popover p-3 text-sm shadow-lg max-w-xs">
                    <p className="font-medium">{d.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat?.color }} />
                      <span style={{ color: cat?.color }}>{cat?.label ?? d.category}</span>
                    </div>
                    <div className="mt-1 text-muted-foreground space-y-0.5">
                      <p>Leverage: {d.leverageScore ?? "—"} / 10</p>
                      <p>Priority: {d.priorityScore ?? "—"} / 10</p>
                      <p>Est. hours: {d.hasHours ? d.estimatedHours : "not set"}</p>
                    </div>
                  </div>
                );
              }}
              cursor={false}
            />

            <Scatter data={data} shape={<BubbleShape />} onClick={(entry: { payload?: BubbleData }) => { if (entry?.payload?.id) router.push(`/tasks?highlight=${entry.payload.id}`); }} />

            {/* Quadrant labels - positioned using data coordinates so they stay inside the plot area */}
            <ReferenceLine y={progressiveScale(8, 10)} stroke="none" ifOverflow="extendDomain">
              <Label value="Quick Wins" position="insideRight" offset={10} style={{ fill: "var(--color-muted-foreground)", opacity: 0.25, fontSize: 15, fontWeight: 700 }} />
            </ReferenceLine>
            <ReferenceLine y={progressiveScale(8, 10)} stroke="none" ifOverflow="extendDomain">
              <Label value="Major Projects" position="insideLeft" offset={10} style={{ fill: "var(--color-muted-foreground)", opacity: 0.25, fontSize: 15, fontWeight: 700 }} />
            </ReferenceLine>
            <ReferenceLine y={progressiveScale(2, 10)} stroke="none" ifOverflow="extendDomain">
              <Label value="Fill-ins" position="insideRight" offset={10} style={{ fill: "var(--color-muted-foreground)", opacity: 0.25, fontSize: 15, fontWeight: 700 }} />
            </ReferenceLine>
            <ReferenceLine y={progressiveScale(2, 10)} stroke="none" ifOverflow="extendDomain">
              <Label value="Avoid" position="insideLeft" offset={10} style={{ fill: "var(--color-muted-foreground)", opacity: 0.25, fontSize: 15, fontWeight: 700 }} />
            </ReferenceLine>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
