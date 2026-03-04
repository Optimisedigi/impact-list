"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveCategories } from "@/server/actions/categories";

export function CategoryManager({ categories }: { categories: string[] }) {
  const [draft, setDraft] = useState(categories.join("\n"));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const labels = draft.split("\n").map((n) => n.trim()).filter(Boolean);
    startTransition(async () => {
      await saveCategories(labels);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Categories</h2>
        <p className="text-sm text-muted-foreground">
          Add one category per line. These feed into category time targets and appear in task dropdowns. Colours are auto-assigned.
        </p>
      </div>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Client Delivery&#10;Systems & Automation&#10;Client Growth Work&#10;Team Management&#10;Admin"
        rows={8}
        className="font-mono text-sm"
      />
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Categories"}
        </Button>
        {saved && <span className="text-sm text-green-500">Saved!</span>}
      </div>
    </div>
  );
}
