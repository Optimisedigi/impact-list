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
import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/lib/use-media-query";
import { averageCompletedWeekHours, formatWeekRange, sliceWeekWindow } from "@/lib/weekly-hours";
import type { WeekHours } from "@/server/queries/daily-logs";

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

function formatHours(value: number): string {
  return `${Math.round(value * 10) / 10}h`;
}

/** Bar value label that, unlike TotalLabel, also renders zero-hour weeks. */
export function HoursValueLabel(props: Record<string, unknown>) {
  const { x, y, width, value } = props as {
    x: number;
    y: number;
    width: number;
    value: number | undefined;
  };
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      fill="var(--color-foreground)"
      fontSize={11}
      fontWeight={600}
      textAnchor="middle"
    >
      {formatHours(value ?? 0)}
    </text>
  );
}

const DESKTOP_WINDOW_WEEKS = 12;
const MOBILE_WINDOW_WEEKS = 6;
/** Matches Tailwind's `md` breakpoint used by the Focus layout. */
const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * Compact weekly hours chart for the Focus board. Shows twelve weeks on desktop
 * and six on mobile, starting at the most recent; the arrows step the window
 * one week at a time.
 */
export function RecentWeeksHoursChart({ data }: { data: WeekHours[] }): React.ReactElement {
  const [requestedOffset, setRequestedOffset] = useState(0);
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const windowWeeks = isDesktop ? DESKTOP_WINDOW_WEEKS : MOBILE_WINDOW_WEEKS;
  const { weeks, offset, maxOffset } = sliceWeekWindow(data, windowWeeks, requestedOffset);
  const hasAnyHours = data.some((d) => d.total > 0);
  const average = averageCompletedWeekHours(weeks);
  const first = weeks[0];
  const last = weeks[weeks.length - 1];

  return (
    <Card className="glass gap-2 py-3 md:gap-6 md:py-6">
      <CardHeader className="px-3 pb-0 md:px-6 md:pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <CardTitle className="text-base">Weekly Hours</CardTitle>
          {hasAnyHours && (
            <p className="text-xs text-muted-foreground md:text-sm">
              Average weekly hours{" "}
              <span className="font-semibold text-foreground tabular-nums md:text-base">{formatHours(average)}</span>
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6">
        {!hasAnyHours ? (
          <p className="text-sm text-muted-foreground">No hours logged yet.</p>
        ) : (
          <>
            <ul className="sr-only">
              {weeks.map((d) => (
                <li key={d.weekCommencing}>
                  Week of {d.label}: {formatHours(d.total)}
                </li>
              ))}
            </ul>
            <div aria-hidden="true" className="h-40 md:h-[200px]">
              {/* A positive initial size avoids Recharts' -1x-1 warning before it measures the box. */}
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 160 }}>
                <BarChart data={weeks} margin={{ top: 20, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  {/* Twelve week labels can crowd a narrow desktop card, so let Recharts drop overlapping ones there. */}
                  <XAxis
                    dataKey="label"
                    tick={TICK_STYLE}
                    interval={isDesktop ? "preserveStartEnd" : 0}
                    tickLine={false}
                  />
                  <YAxis tick={TICK_STYLE} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload as WeekHours | undefined;
                      if (!row) return null;
                      return (
                        <div style={tooltipBox}>
                          <p style={{ fontWeight: 600 }}>w/c {row.label}</p>
                          <p style={{ marginTop: 4 }}>{formatHours(row.total)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill={BAR_GREEN}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={48}
                    isAnimationActive={!reduceMotion}
                  >
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <LabelList dataKey="total" content={HoursValueLabel as any} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:mt-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 justify-self-start text-muted-foreground"
                onClick={() => setRequestedOffset(offset + 1)}
                disabled={offset >= maxOffset}
                aria-label="Show earlier week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
                {first && last ? formatWeekRange(first.weekCommencing, last.weekCommencing) : null}
              </p>
              <div className="flex items-center gap-1 justify-self-end">
                {offset > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => setRequestedOffset(0)}
                  >
                    Latest
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => setRequestedOffset(offset - 1)}
                  disabled={offset === 0}
                  aria-label="Show later week"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
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
