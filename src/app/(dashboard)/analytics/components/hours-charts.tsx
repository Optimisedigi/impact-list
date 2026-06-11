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

const BAR_GREEN = "hsl(150 60% 45%)";

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
}: {
  data: Record<string, unknown>[];
}): React.ReactElement {
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
                      {total ? <p style={{ marginTop: 4 }}>{Math.round(total * 10) / 10}h</p> : null}
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" fill={BAR_GREEN} radius={[2, 2, 0, 0]}>
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

// Build a rolling 12-month window ending at the current month, filling totals
// from the data (missing months render as empty bars).
function buildTwelveMonthWindow(
  data: { month: string; total: number }[]
): { month: string; label: string; total: number }[] {
  const totals = new Map(data.map((d) => [d.month, d.total]));
  const now = new Date();
  const months: { month: string; label: string; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });
    months.push({ month: key, label, total: totals.get(key) ?? 0 });
  }
  return months;
}

export function MonthlyHoursChart({ data }: { data: { month: string; total: number }[] }): React.ReactElement {
  const windowed = buildTwelveMonthWindow(data);
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
            <BarChart data={windowed} margin={{ bottom: 30, left: 10, top: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={TICK_STYLE} interval={0}>
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
