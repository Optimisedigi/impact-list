"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveWeeklyPriorities } from "@/server/actions/weekly-priorities";
import { Pencil, Check } from "lucide-react";

export function WeeklyPrioritiesCard({ initialPriorities }: { initialPriorities: string | null }) {
  const [editing, setEditing] = useState(!initialPriorities);
  const [draft, setDraft] = useState(initialPriorities ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await saveWeeklyPriorities(draft);
      setEditing(false);
    });
  }

  return (
    <Card className="glass py-2 gap-1">
      <CardHeader className="px-4 py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">This Week&apos;s Priorities</CardTitle>
          {!editing && initialPriorities && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={"What must get done this week?\ne.g.\n- Close proposal for Client X\n- Finish onboarding automation\n- Ship landing page v1"}
              rows={4}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              {initialPriorities && (
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setDraft(initialPriorities); }}>
                  Cancel
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={isPending || !draft.trim()}>
                <Check className="mr-1 h-3 w-3" />
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm whitespace-pre-line text-muted-foreground">
            {initialPriorities || "No priorities set for this week."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
