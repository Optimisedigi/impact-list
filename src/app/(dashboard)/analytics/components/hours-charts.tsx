"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryOption } from "@/lib/constants";

// Mirror of UNTAGGED_KEY in queries/daily-logs (kept local to avoid bundling
// the server DB module into this client component).
const UNTAGGED_KEY = "__untagged__";
const UNTAGGED_COLOR = "var(--color-muted-foreground)";

const TICK_STYLE = { fill: "var(--color-muted-foreground)", fontSize: 11 };
const LABEL_STYLE: Record<string, string | number> = {
  fill: "var(--color-foreground)",
  fontSize: 12,
  fontWeight: 600,
};
const GRID_STROKE = "var(--color-border)";

const tooltipBox: React.CSSProperties = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  padding: "10px",
  fontSize: "12px",
  color: "var(--color-foreground)",
};

function TotalLabel(props: Record<string, unknown>) {
  const { x, y, width, value } = props as {
    x: number;
    y: number;
    width: number;
    value: number;
  };
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 4}
      fill="var(--color-foreground)"
      fontSize={10}
      fontWeight={600}
      textAnchor="middle"
    >
      {Math.round(value * 10) / 10}
    </text>
  );
}

export function WeeklyHoursChart({
  data,
  categoryOptions,
}: {
  data: Record<string, unknown>[];
  categoryOptions: CategoryOption[];
}): React.ReactElement {
  const series = [
    ...categoryOptions.map((c) => ({ key: c.value, label: c.label, color: c.color })),
    { key: UNTAGGED_KEY, label: "Untagged", color: UNTAGGED_COLOR },
  ];
  const hasData = data.some((d) => (d.total as number) > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hours per week</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">No hours logged yet.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-4">
              {series.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color, opacity: 0.8 }} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ bottom: 30, left: 10, top: 16 }}>
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
                    const total = row?.total as number | undefined;
                    return (
                      <div style={tooltipBox}>
                        <p style={{ fontWeight: 600 }}>{label}{wc ? ` (w/c ${wc})` : ""}</p>
                        <div style={{ marginTop: 4 }}>
                          {payload
                            .filter((p) => (p.value as number) > 0)
                            .map((p) => (
                              <p key={p.dataKey as string} style={{ color: p.color as string }}>
                                {p.name}: {p.value as number}h
                              </p>
                            ))}
                          {total ? <p style={{ marginTop: 2, fontWeight: 600 }}>Total: {Math.round(total * 10) / 10}h</p> : null}
                        </div>
                      </div>
                    );
                  }}
                />
                {series.map((s, i) => (
                  <Bar key={s.key} dataKey={s.key} stackId="1" fill={s.color} name={s.label}>
                    {i === series.length - 1 && (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      <LabelList dataKey="total" content={TotalLabel as any} />
                    )}
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

export function MonthlyHoursChart({ data }: { data: { month: string; total: number }[] }): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hours per month</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hours logged yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ bottom: 30, left: 10, top: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={TICK_STYLE}>
                <Label value="Month" position="bottom" offset={10} style={LABEL_STYLE} />
              </XAxis>
              <YAxis tick={TICK_STYLE}>
                <Label value="Hours" angle={-90} position="insideLeft" offset={-5} style={{ ...LABEL_STYLE, textAnchor: "middle" }} />
              </YAxis>
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={tooltipBox}>
                      <p style={{ fontWeight: 600 }}>{label}</p>
                      <p style={{ marginTop: 4 }}>{Math.round((payload[0]?.value as number) * 10) / 10}h</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" fill="hsl(240 80% 65%)" radius={[2, 2, 0, 0]}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <LabelList dataKey="total" content={TotalLabel as any} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
