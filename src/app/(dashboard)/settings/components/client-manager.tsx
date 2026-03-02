"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveClients } from "@/server/actions/clients";

export function ClientManager({ clients }: { clients: string[] }) {
  const [draft, setDraft] = useState(clients.join("\n"));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const names = draft.split("\n").map((n) => n.trim()).filter(Boolean);
    startTransition(async () => {
      await saveClients(names);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Clients</h2>
        <p className="text-sm text-muted-foreground">
          Add one client name per line. These will appear as dropdown options in the task table.
        </p>
      </div>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Client A&#10;Client B&#10;Client C"
        rows={8}
        className="font-mono text-sm"
      />
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Clients"}
        </Button>
        {saved && <span className="text-sm text-green-500">Saved!</span>}
      </div>
    </div>
  );
}
