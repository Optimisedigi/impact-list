"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { saveLifeWeeksSettings, type LifeWeeksSettingsData } from "@/server/actions/life-weeks";
import { buildLifeWeeksGrid } from "@/lib/life-weeks";
import { cn } from "@/lib/utils";

const DECADES = [
  "#cdc4e4",
  "#b0a2d6",
  "#8e7cc6",
  "#6f7fc9",
  "#4a86c8",
  "#5aa7cf",
  "#4fb0ae",
  "#5cb391",
  "#8bb96b",
  "#c2a44f",
];
const WEEKS_PER_YEAR = 52;

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 bg-card p-3">
      <div className="text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{label}</div>
      <div className="text-lg font-medium">{value}</div>
      {sub && <div className="text-[13px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function LifeWeeksView({ initial }: { initial: LifeWeeksSettingsData | null }) {
  const [settings, setSettings] = useState(initial);
  const [form, setForm] = useState({
    dateOfBirth: initial?.dateOfBirth ?? "",
    lifeExpectancyYears: String(initial?.lifeExpectancyYears ?? 90),
  });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);

  const grid = useMemo(() => {
    if (!settings) return null;
    return buildLifeWeeksGrid(settings.dateOfBirth, settings.lifeExpectancyYears);
  }, [settings]);

  const stats = useMemo(() => {
    if (!settings || !grid) return null;
    const birth = new Date(`${settings.dateOfBirth}T00:00:00`);
    const today = new Date();
    const lived = Math.min(grid.currentWeekIndex, grid.totalWeeks);
    const remaining = Math.max(0, grid.totalWeeks - lived);
    const pct = grid.totalWeeks ? Math.round((lived / grid.totalWeeks) * 1000) / 10 : 0;
    const jan1 = new Date(today.getFullYear(), 0, 1);
    const weekOfYear = Math.ceil(
      ((today.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7,
    );
    const years = Math.ceil(grid.totalWeeks / WEEKS_PER_YEAR);
    return { birth, today, lived, remaining, pct, weekOfYear, years };
  }, [settings, grid]);

  const rows = useMemo(() => {
    if (!grid) return [];
    const out: (typeof grid.weeks)[] = [];
    for (let i = 0; i < grid.weeks.length; i += WEEKS_PER_YEAR) {
      out.push(grid.weeks.slice(i, i + WEEKS_PER_YEAR));
    }
    return out;
  }, [grid]);

  function handleSave() {
    const years = Number(form.lifeExpectancyYears);
    if (!form.dateOfBirth || !Number.isFinite(years) || years <= 0) return;
    const data: LifeWeeksSettingsData = { dateOfBirth: form.dateOfBirth, lifeExpectancyYears: years };
    setError(null);
    startTransition(async () => {
      try {
        await saveLifeWeeksSettings(data);
        setSettings(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  // In fit mode the grid fills the viewport: squares shrink to whatever both
  // 52 columns and the row count allow, so no scrolling is ever needed.
  const fitCell = `min((100vw - 80px) / ${WEEKS_PER_YEAR}, (100vh - 120px) / ${Math.max(1, rows.length)})`;
  const cell = compact ? fitCell : "13px";

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-[260px] flex-1 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">My life in weeks</h1>
          <p className="text-[15px] text-muted-foreground">
            Every week of your life, one square each. Filled squares are weeks already lived — each
            decade has its own colour.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-3">
          <div className="space-y-2">
            <Label htmlFor="lw-dob" className="text-[13px]">
              I was born on
            </Label>
            <Input
              id="lw-dob"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              className="w-44"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lw-expectancy" className="text-[13px]">
              Expected years to live until
            </Label>
            <Input
              id="lw-expectancy"
              type="number"
              min="1"
              max="130"
              value={form.lifeExpectancyYears}
              onChange={(e) => setForm({ ...form, lifeExpectancyYears: e.target.value })}
              className="w-24"
            />
          </div>
          <Button onClick={handleSave} disabled={isPending} className="rounded-full">
            {saved ? (
              <>
                <Check className="mr-1 h-3 w-3" />
                Saved
              </>
            ) : isPending ? (
              "Saving..."
            ) : (
              "Save & calculate"
            )}
          </Button>
          {error && <p className="w-full text-xs text-destructive">{error}</p>}
        </div>
      </div>

      {grid && stats && (
        <>
          <div className="grid gap-px overflow-hidden rounded-2xl border bg-border [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
            <Stat
              label="Today"
              value={fmtDate(stats.today)}
              sub={`week ${stats.weekOfYear} of this year`}
            />
            <Stat
              label="Weeks lived"
              value={<span className="font-mono">{stats.lived.toLocaleString()}</span>}
              sub={`since ${fmtDate(stats.birth)}`}
            />
            <Stat
              label="Weeks remaining"
              value={<span className="font-mono">{stats.remaining.toLocaleString()}</span>}
              sub={`of ${grid.totalWeeks.toLocaleString()} in total`}
            />
            <div className="flex flex-col gap-1.5 bg-card p-3">
              <div className="text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
                If I live to {stats.years}
              </div>
              <div className="text-lg font-medium">
                I&apos;ve lived <span className="font-mono">{stats.pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[#4a86c8]"
                  style={{ width: `${Math.min(100, stats.pct)}%` }}
                />
              </div>
            </div>
          </div>

          <div
            className={
              compact
                ? "fixed inset-0 z-50 flex flex-col overflow-hidden bg-background p-2"
                : "overflow-x-auto rounded-2xl border bg-card p-3"
            }
          >
            {compact && stats && (
              <div className="flex flex-col items-center gap-1 pb-2">
                <h2 className="text-lg font-semibold tracking-tight">My life in weeks</h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    <span className="font-mono font-medium text-foreground">{stats.remaining.toLocaleString()}</span> weeks remaining
                  </span>
                  <span className="text-border">|</span>
                  <span>
                    <span className="font-mono font-medium text-foreground">{stats.pct}%</span> of life lived
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setCompact((c) => !c)}
              >
                {compact ? "Comfortable squares" : "Fit whole life"}
              </Button>
            </div>

            <div className={cn("flex gap-2.5", compact ? "w-full justify-center" : "w-max")}>
              <div className="flex items-center justify-center pt-5">
                <span className="text-[11px] uppercase tracking-[0.09em] text-muted-foreground [writing-mode:vertical-rl] rotate-180">
                  Age
                </span>
              </div>

              <div className={cn("flex flex-col", !compact && "gap-px")}>
                <div
                  className={cn(
                    "pb-2 pl-[30px] text-center text-[11px] uppercase tracking-[0.09em] text-muted-foreground",
                    compact && "hidden",
                  )}
                >
                  Weeks of the year
                </div>
                <div className={cn("flex items-center pb-1", !compact && "gap-px")}>
                  <div className="w-[30px] flex-none" />
                  {Array.from({ length: WEEKS_PER_YEAR }, (_, i) => i + 1).map((w) => (
                    <div
                      key={w}
                      className="flex-none text-center font-mono text-[8px] text-muted-foreground"
                      style={{ width: cell }}
                    >
                      {w === 1 || w % 5 === 0 || w === WEEKS_PER_YEAR ? w : ""}
                    </div>
                  ))}
                </div>

                {rows.map((weeks, year) => (
                  <div
                    key={year}
                    className={cn("flex items-center", !compact && "gap-px")}
                    style={{ marginTop: !compact && year > 0 && year % 10 === 0 ? 6 : 0 }}
                  >
                    <div
                      className={cn(
                        "w-[30px] flex-none pr-2 text-right font-mono text-[9px]",
                        year % 10 === 0 ? "text-foreground" : "text-muted-foreground",
                      )}
                      style={{ lineHeight: cell }}
                    >
                      {year % 5 === 0 || year === rows.length - 1 ? year : ""}
                    </div>
                    {weeks.map((week, w) => {
                      const color = DECADES[Math.floor(year / 10) % DECADES.length];
                      return (
                        <div
                          key={week.index}
                          title={`Age ${year}, week ${w + 1} — ${week.weekStart}`}
                          className={cn(
                            "flex-none rounded-[3px] border box-border",
                            week.status === "current" && "border-2 border-foreground",
                            week.status === "future" && "border-border",
                          )}
                          style={{
                            width: cell,
                            height: cell,
                            ...(week.status === "past"
                              ? { background: color, borderColor: color }
                              : {}),
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 px-0.5 text-xs text-muted-foreground">
            {Array.from({ length: Math.ceil(rows.length / 10) }, (_, d) => (
              <div key={d} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-[3px]"
                  style={{ background: DECADES[d % DECADES.length] }}
                />
                {d * 10}s
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-[3px] border" />
              Not yet lived
            </div>
          </div>
        </>
      )}
    </div>
  );
}
