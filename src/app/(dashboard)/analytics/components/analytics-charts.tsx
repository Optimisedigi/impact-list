"use client";

import { useState, useRef, useTransition } from "react";
import { updateTaskField, deleteTask } from "@/server/actions/tasks";
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
  Label,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import type { CategoryTarget } from "@/types";

// Theme-aware styles using CSS variables
const TICK_STYLE = { fill: "var(--color-muted-foreground)", fontSize: 11 };
const LABEL_STYLE: Record<string, string | number> = { fill: "var(--color-foreground)", fontSize: 12, fontWeight: 600 };
const GRID_STROKE = "var(--color-border)";

const tooltipBox: React.CSSProperties = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  padding: "10px",
  fontSize: "12px",
  color: "var(--color-foreground)",
};

const chartTooltipStyle = {
  contentStyle: tooltipBox,
};

// Custom label renderer for stacked bar segments - only show if segment is tall enough
function StackedBarLabel(props: Record<string, unknown>) {
  const { x, y, width, height, value } = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    value: number;
  };
  if (!value || value === 0 || height < 18) return null;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="white"
      fontSize={10}
      fontWeight={600}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {value}%
    </text>
  );
}

export function AllocationTrend({ data, targets }: { data: Record<string, unknown>[]; targets: CategoryTarget[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly Time Allocation ({data.length} weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Category legend */}
        <div className="flex flex-wrap items-center gap-4 mb-3">
          {Object.entries(DEFAULT_CATEGORIES).map(([key, cat]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color, opacity: 0.8 }} />
              <span className="text-xs text-muted-foreground">{cat.label}</span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="week" tick={TICK_STYLE}>
              <Label value="Week" position="bottom" offset={10} style={LABEL_STYLE} />
            </XAxis>
            <YAxis tick={TICK_STYLE}>
              <Label value="Hours" angle={-90} position="insideLeft" offset={-5} style={{ ...LABEL_STYLE, textAnchor: "middle" }} />
            </YAxis>
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as Record<string, unknown>;
                const wc = row?.weekCommencing as string | undefined;
                return (
                  <div style={tooltipBox}>
                    <p style={{ fontWeight: 600 }}>{label}{wc ? ` (w/c ${wc})` : ""}</p>
                    <div style={{ marginTop: 4 }}>
                      {payload.filter((p) => (p.value as number) > 0).map((p) => (
                        <p key={p.dataKey as string} style={{ color: p.color as string }}>
                          {DEFAULT_CATEGORIES[p.dataKey as CategoryKey]?.label ?? p.dataKey}: {p.value as number}h
                        </p>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            {Object.entries(DEFAULT_CATEGORIES).map(([key, cat]) => (
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

  const data = Object.entries(DEFAULT_CATEGORIES).map(([key, cat]) => {
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
            <PolarGrid stroke="var(--color-border)" />
            <PolarAngleAxis dataKey="category" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
            <Radar name="Actual" dataKey="actual" stroke="hsl(240 80% 65%)" fill="hsl(240 80% 65%)" fillOpacity={0.3} />
            <Radar name="Target" dataKey="target" stroke="var(--color-muted-foreground)" fill="none" strokeDasharray="5 5" />
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
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="date" tick={TICK_STYLE} />
            <YAxis tick={TICK_STYLE} />
            <Tooltip {...chartTooltipStyle} />
            <Line type="monotone" dataKey="remaining" stroke="hsl(240 80% 65%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function LeverageTrendChart({ data }: { data: Record<string, unknown>[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Completed Task Leverage Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="week" tick={TICK_STYLE}>
              <Label value="Week" position="bottom" offset={10} style={LABEL_STYLE} />
            </XAxis>
            <YAxis domain={[0, 10]} tick={TICK_STYLE}>
              <Label value="Avg Leverage" angle={-90} position="insideLeft" offset={-5} style={{ ...LABEL_STYLE, textAnchor: "middle" }} />
            </YAxis>
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as Record<string, unknown>;
                const wc = row?.weekCommencing as string | undefined;
                const val = payload[0]?.value as number;
                return (
                  <div style={tooltipBox}>
                    <p style={{ fontWeight: 600 }}>{label}{wc ? ` (w/c ${wc})` : ""}</p>
                    <p style={{ marginTop: 4, color: "hsl(50 100% 60%)" }}>Avg Leverage: {typeof val === "number" ? val.toFixed(1) : "—"}</p>
                  </div>
                );
              }}
            />
            <Line type="monotone" dataKey="avgLeverage" stroke="hsl(50 100% 60%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CategoryPercentageChart({ data }: { data: Record<string, unknown>[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Category Breakdown by Week ({data.length} weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.every((d) => Object.keys(d).length <= 2) ? (
          <p className="text-sm text-muted-foreground">No time data yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 mb-3">
              {Object.entries(DEFAULT_CATEGORIES).map(([key, cat]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color, opacity: 0.8 }} />
                  <span className="text-xs text-muted-foreground">{cat.label}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="week" tick={TICK_STYLE}>
                  <Label value="Week" position="bottom" offset={10} style={LABEL_STYLE} />
                </XAxis>
                <YAxis domain={[0, 100]} tick={TICK_STYLE} tickFormatter={(v) => `${v}%`}>
                  <Label value="% of Time" angle={-90} position="insideLeft" offset={-5} style={{ ...LABEL_STYLE, textAnchor: "middle" }} />
                </YAxis>
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as Record<string, unknown>;
                    const wc = row?.weekCommencing as string | undefined;
                    return (
                      <div style={tooltipBox}>
                        <p style={{ fontWeight: 600 }}>{label}{wc ? ` (w/c ${wc})` : ""}</p>
                        <div style={{ marginTop: 4 }}>
                          {payload.filter((p) => (p.value as number) > 0).map((p) => (
                            <p key={p.dataKey as string} style={{ color: p.color as string }}>
                              {p.name}: {p.value as number}%
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />
                {Object.entries(DEFAULT_CATEGORIES).map(([key, cat]) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="1"
                    fill={cat.color}
                    name={cat.label}
                    radius={[0, 0, 0, 0]}
                  >
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <LabelList dataKey={key} content={StackedBarLabel as any} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EditableHours({ taskId, value }: { taskId: number; value: number | null }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    const raw = inputRef.current?.value.trim() ?? "";
    const num = raw === "" ? null : parseFloat(raw);
    if (num !== null && (isNaN(num) || num < 0)) return;
    if (num === value) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await updateTaskField(taskId, "actualHours", num);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.25"
        min="0"
        defaultValue={value ?? ""}
        autoFocus
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-16 rounded border border-border bg-background px-1.5 py-0.5 text-right text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
        disabled={isPending}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="cursor-pointer rounded px-1.5 py-0.5 text-right tabular-nums hover:bg-muted transition-colors"
      title="Click to edit hours"
    >
      {value != null && value > 0 ? `${value}h` : "-"}
    </button>
  );
}

function DeleteTaskButton({ taskId }: { taskId: number }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this task?")) {
          startTransition(() => deleteTask(taskId));
        }
      }}
      title="Delete task"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

export function CompletedTasksList({
  data,
}: {
  data: {
    id: number;
    title: string;
    category: string;
    client: string | null;
    estimatedHours: number | null;
    actualHours: number | null;
    completedDate: string;
  }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? data : data.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recently Completed Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Task</th>
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium text-right">Est.</th>
                    <th className="pb-2 pr-4 font-medium text-right">Actual</th>
                    <th className="pb-2 pr-4 font-medium text-right">Diff</th>
                    <th className="pb-2 pr-4 font-medium">Completed</th>
                    <th className="pb-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((task) => {
                    const diff =
                      task.estimatedHours != null && task.actualHours != null
                        ? task.actualHours - task.estimatedHours
                        : null;
                    const cat = DEFAULT_CATEGORIES[task.category as CategoryKey];
                    return (
                      <tr key={task.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4">
                          <div className="font-medium">{task.title}</div>
                          {task.client && (
                            <div className="text-xs text-muted-foreground">{task.client}</div>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
                            style={{ backgroundColor: cat?.color ?? "var(--color-muted)" }}
                          >
                            {cat?.label ?? task.category}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                          {task.estimatedHours != null ? `${task.estimatedHours}h` : "-"}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          <EditableHours taskId={task.id} value={task.actualHours} />
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {diff != null ? (
                            <span
                              className={
                                diff > 0
                                  ? "text-red-400"
                                  : diff < 0
                                    ? "text-green-400"
                                    : "text-muted-foreground"
                              }
                            >
                              {diff > 0 ? "+" : ""}
                              {diff.toFixed(1)}h
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{task.completedDate}</td>
                        <td className="py-2">
                          <DeleteTaskButton taskId={task.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.length > 5 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? "Show less" : `Show all ${data.length} completed tasks`}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CompletionHeatmap({ data }: { data: { date: string; count: number }[] }) {
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
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="date" tick={TICK_STYLE} />
              <YAxis allowDecimals={false} tick={TICK_STYLE} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="count" fill="hsl(150 60% 50%)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
