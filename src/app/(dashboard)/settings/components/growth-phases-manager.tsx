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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPhase,
  updatePhase,
  setActivePhase,
  deletePhase,
} from "@/server/actions/growth-phases";
import type { GrowthPhase } from "@/types";
import { Plus, Check, Trash2, Pencil } from "lucide-react";

const TIMEFRAME_OPTIONS = [
  { value: "90_day", label: "90-Day Goal" },
  { value: "180_day", label: "180-Day Goal" },
];

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
  const [timeframe, setTimeframe] = useState<string>(phase?.timeframe ?? "90_day");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (phase) {
        await updatePhase(phase.id, { name, description, focusAreas, timeframe });
      } else {
        await createPhase({ name, description, focusAreas, timeframe });
      }
      setOpen(false);
      onClose?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && phase) { setName(phase.name); setDescription(phase.description ?? ""); setFocusAreas(phase.focusAreas ?? ""); setTimeframe(phase.timeframe ?? "90_day"); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{phase ? "Edit Phase" : "New Phase"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <Label htmlFor="phase-name">Goal Name</Label>
              <Input id="phase-name" value={name} onChange={(e) => setName(e.target.value)} placeholder='e.g. "Lock in 3 retainer clients"' required />
            </div>
            <div>
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEFRAME_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="phase-desc">What does success look like?</Label>
            <p className="text-xs text-muted-foreground mb-1">Describe your goals for this phase. The AI uses this to judge which tasks have the highest leverage.</p>
            <Textarea id="phase-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder='e.g. "Lock in 3 retainer clients at $5k+/month, build SOPs for delivery so I can delegate, launch lead magnet"' />
          </div>
          <div>
            <Label htmlFor="phase-focus">Focus Areas</Label>
            <p className="text-xs text-muted-foreground mb-1">Comma-separated list of what you should be spending time on right now.</p>
            <Input id="phase-focus" value={focusAreas} onChange={(e) => setFocusAreas(e.target.value)} placeholder='e.g. "Closing retainer deals, building SOPs, CRM automations"' />
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Goals</CardTitle>
          <PhaseDialog
            trigger={
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Goal
              </Button>
            }
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Set a <strong>90-day goal</strong> (primary focus) and a <strong>180-day goal</strong> (where you&apos;re heading).
          The AI prioritises tasks that drive your 90-day goal, with the 180-day goal as secondary context.
          You can have one active goal per timeframe.
        </p>
      </CardHeader>
      <CardContent>
        {phases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No growth phases defined yet. Add one above to get started.</p>
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
                    <Badge variant="secondary" className="text-xs">
                      {phase.timeframe === "180_day" ? "180-Day" : "90-Day"}
                    </Badge>
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
