"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CategoryOption } from "@/lib/constants";
import { upsertCategoryTargets } from "@/server/actions/category-targets";
import type { CategoryTarget } from "@/types";

export function CategoryTargetsForm({ targets, categoryOptions }: { targets: CategoryTarget[]; categoryOptions: CategoryOption[] }) {
  const targetMap = Object.fromEntries(targets.map((t) => [t.category, t.targetPercentage]));
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(
      categoryOptions.map((c) => [c.value, targetMap[c.value] ?? 0])
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
        {categoryOptions.map((cat) => (
          <div key={cat.value} className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
            <Label className="w-32 shrink-0">{cat.label}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              className="w-20"
              value={values[cat.value] ?? 0}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [cat.value]: Number(e.target.value) }))
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
            {categoryOptions.map((cat) => (
              <div
                key={cat.value}
                className="h-full transition-all"
                style={{
                  width: `${values[cat.value] ?? 0}%`,
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
