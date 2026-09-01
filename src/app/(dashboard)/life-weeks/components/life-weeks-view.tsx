"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hourglass, Check } from "lucide-react";
import { saveLifeWeeksSettings, type LifeWeeksSettingsData } from "@/server/actions/life-weeks";
import { buildLifeWeeksGrid } from "@/lib/life-weeks";
import { cn } from "@/lib/utils";

export function LifeWeeksView({ initial }: { initial: LifeWeeksSettingsData | null }) {
  const [settings, setSettings] = useState(initial);
  const [form, setForm] = useState({
    dateOfBirth: initial?.dateOfBirth ?? "",
    lifeExpectancyYears: String(initial?.lifeExpectancyYears ?? 90),
  });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grid = useMemo(() => {
    if (!settings) return null;
    return buildLifeWeeksGrid(settings.dateOfBirth, settings.lifeExpectancyYears);
  }, [settings]);

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

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hourglass className="h-4 w-4" />
            My Life in Weeks
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Every week of your life, one square each. Filled squares are weeks already lived.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="lw-dob">Date of birth</Label>
            <Input
              id="lw-dob"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              className="w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lw-expectancy">Expected years to live until</Label>
            <Input
              id="lw-expectancy"
              type="number"
              min="1"
              max="130"
              value={form.lifeExpectancyYears}
              onChange={(e) => setForm({ ...form, lifeExpectancyYears: e.target.value })}
              className="w-28"
            />
          </div>
          <Button onClick={handleSave} disabled={isPending} size="sm">
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
        </CardContent>
      </Card>

      {grid && (
        <Card>
          <CardContent className="overflow-x-auto py-4">
            <p className="mb-3 text-xs text-muted-foreground">
              {grid.currentWeekIndex.toLocaleString()} weeks lived of {grid.totalWeeks.toLocaleString()} —{" "}
              {Math.max(0, grid.totalWeeks - grid.currentWeekIndex).toLocaleString()} weeks remaining.
            </p>
            <div
              className="grid w-max gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${grid.weeksPerYear}, 10px)` }}
              role="img"
              aria-label={`Life in weeks grid, ${grid.currentWeekIndex} of ${grid.totalWeeks} weeks lived`}
            >
              {grid.weeks.map((week) => (
                <div
                  key={week.index}
                  title={`Week ${week.index + 1} — ${week.weekStart}`}
                  className={cn(
                    "h-[10px] w-[10px] rounded-[1px] border",
                    week.status === "past" && "border-primary bg-primary",
                    week.status === "current" && "border-primary bg-primary/40 ring-1 ring-primary",
                    week.status === "future" && "border-border bg-transparent",
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
