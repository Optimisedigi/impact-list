"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CATEGORIES } from "@/lib/constants";
import type { CategoryKey } from "@/lib/constants";
import { upsertCategoryTargets } from "@/server/actions/category-targets";
import type { CategoryTarget } from "@/types";

export function CategoryTargetsForm({ targets }: { targets: CategoryTarget[] }) {
  const targetMap = Object.fromEntries(targets.map((t) => [t.category, t.targetPercentage]));
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(
      Object.keys(CATEGORIES).map((k) => [k, targetMap[k] ?? 0])
    )
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sum = Object.values(values).reduce((a, b) => a + b, 0);

  function handleSave() {
    if (sum !== 100) {
      setError(`Targets must sum to 100%, currently ${sum}%`);
      return;
    }
    setError(null);
    startTransition(async () => {
      await upsertCategoryTargets(
        Object.entries(values).map(([category, targetPercentage]) => ({
          category,
          targetPercentage,
        }))
      );
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Time Targets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <div key={key} className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
            <Label className="w-32 shrink-0">{cat.label}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              className="w-20"
              value={values[key]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [key]: Number(e.target.value) }))
              }
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        ))}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Total: {sum}%</span>
            {sum !== 100 && (
              <span className="text-xs text-destructive">Must equal 100%</span>
            )}
          </div>
          <div className="h-2 flex-1 mx-4 rounded-full bg-muted overflow-hidden flex">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <div
                key={key}
                className="h-full transition-all"
                style={{
                  width: `${values[key]}%`,
                  backgroundColor: cat.color,
                }}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSave} disabled={isPending || sum !== 100}>
          {isPending ? "Saving..." : "Save Targets"}
        </Button>
      </CardContent>
    </Card>
  );
}
