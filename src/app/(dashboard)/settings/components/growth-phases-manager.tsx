"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createPhase,
  updatePhase,
  setActivePhase,
  deletePhase,
} from "@/server/actions/growth-phases";
import type { GrowthPhase } from "@/types";
import { Plus, Check, Trash2, Pencil } from "lucide-react";

function PhaseDialog({
  phase,
  trigger,
  onClose,
}: {
  phase?: GrowthPhase;
  trigger: React.ReactNode;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(phase?.name ?? "");
  const [description, setDescription] = useState(phase?.description ?? "");
  const [focusAreas, setFocusAreas] = useState(phase?.focusAreas ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (phase) {
        await updatePhase(phase.id, { name, description, focusAreas });
      } else {
        await createPhase({ name, description, focusAreas });
      }
      setOpen(false);
      onClose?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && phase) { setName(phase.name); setDescription(phase.description ?? ""); setFocusAreas(phase.focusAreas ?? ""); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{phase ? "Edit Phase" : "New Phase"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="phase-name">Name</Label>
            <Input id="phase-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="phase-desc">Description</Label>
            <Textarea id="phase-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label htmlFor="phase-focus">Focus Areas</Label>
            <Input id="phase-focus" value={focusAreas} onChange={(e) => setFocusAreas(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GrowthPhasesManager({ phases }: { phases: GrowthPhase[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Growth Phases</CardTitle>
        <PhaseDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Add Phase
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {phases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No growth phases defined. Run the seed script or add one above.</p>
        ) : (
          <div className="space-y-3">
            {phases.map((phase) => (
              <div
                key={phase.id}
                className={`flex items-start justify-between rounded-lg border p-3 ${
                  phase.isActive ? "border-primary/50 bg-primary/5" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{phase.name}</p>
                    {phase.isActive && (
                      <Badge variant="outline" className="border-primary/50 text-primary text-xs">Active</Badge>
                    )}
                  </div>
                  {phase.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{phase.description}</p>
                  )}
                  {phase.focusAreas && (
                    <p className="mt-1 text-xs text-muted-foreground">Focus: {phase.focusAreas}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {!phase.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={isPending}
                      onClick={() => startTransition(() => setActivePhase(phase.id))}
                      title="Set active"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <PhaseDialog
                    phase={phase}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    disabled={isPending}
                    onClick={() => {
                      if (confirm("Delete this phase?")) {
                        startTransition(() => deletePhase(phase.id));
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
