"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { CategoryOption } from "@/lib/constants";
import {
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
  generateRecurringTasks,
} from "@/server/actions/recurring-tasks";
import type { RecurringTask } from "@/types";
import { Plus, Trash2, Pencil, RefreshCw, Pause, Play } from "lucide-react";

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
];

const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

function RecurringTaskDialog({
  task,
  trigger,
  clientOptions,
  categoryOptions,
}: {
  task?: RecurringTask;
  trigger: React.ReactNode;
  clientOptions: string[];
  categoryOptions: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(task?.title ?? "");
  const [category, setCategory] = useState<string>(task?.category ?? "client_delivery");
  const [client, setClient] = useState(task?.client ?? "");
  const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours?.toString() ?? "");
  const [frequency, setFrequency] = useState<string>(task?.frequency ?? "weekly");
  const [dayOfWeek, setDayOfWeek] = useState(task?.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(task?.dayOfMonth ?? 1);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const data = {
        title,
        category,
        client: client || null,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        frequency,
        dayOfWeek,
        dayOfMonth: frequency === "monthly" ? dayOfMonth : null,
      };
      if (task) {
        await updateRecurringTask(task.id, data);
      } else {
        await createRecurringTask(data);
      }
      setOpen(false);
      if (!task) {
        setTitle("");
        setClient("");
        setEstimatedHours("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v && task) {
        setTitle(task.title);
        setCategory(task.category);
        setClient(task.client ?? "");
        setEstimatedHours(task.estimatedHours?.toString() ?? "");
        setFrequency(task.frequency);
        setDayOfWeek(task.dayOfWeek ?? 1);
        setDayOfMonth(task.dayOfMonth ?? 1);
      }
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Edit Recurring Task" : "New Recurring Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="rt-title">Task Title</Label>
            <Input id="rt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder='e.g. "Weekly client report"' required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Client</Label>
              {clientOptions.length > 0 ? (
                <Select value={client || "__none__"} onValueChange={(v) => setClient(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {clientOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {frequency === "monthly" ? (
              <div>
                <Label>Day of Month</Label>
                <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}{d === 1 || d === 21 || d === 31 ? "st" : d === 2 || d === 22 ? "nd" : d === 3 || d === 23 ? "rd" : "th"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Day</Label>
                <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Est. Hours</Label>
              <Input type="number" step="0.5" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RecurringTasksManager({
  tasks,
  clientOptions,
  categoryOptions,
}: {
  tasks: RecurringTask[];
  clientOptions: string[];
  categoryOptions: CategoryOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [generated, setGenerated] = useState<number | null>(null);

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateRecurringTasks();
      setGenerated(result.created);
      setTimeout(() => setGenerated(null), 3000);
    });
  }

  const freqLabel: Record<string, string> = { weekly: "Weekly", fortnightly: "Fortnightly", monthly: "Monthly" };
  const dayLabel: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recurring Tasks</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isPending}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
              {isPending ? "Generating..." : "Generate Now"}
            </Button>
            <RecurringTaskDialog
              clientOptions={clientOptions}
              categoryOptions={categoryOptions}
              trigger={
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Recurring
                </Button>
              }
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Tasks that repeat on a schedule. They auto-generate as new tasks when due. Once completed, they stay done until the next cycle creates a fresh one.
          Press "Generate Now" or tasks are created automatically when you load the app.
        </p>
        {generated !== null && (
          <p className="text-sm text-green-600 dark:text-green-400">
            {generated === 0 ? "All recurring tasks are up to date." : `Created ${generated} task${generated > 1 ? "s" : ""}.`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recurring tasks set up yet.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${!task.isActive ? "opacity-50" : ""}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{task.title}</p>
                    <Badge variant="outline" className="text-xs">{freqLabel[task.frequency]}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      {task.frequency === "monthly" && task.dayOfMonth
                        ? `${task.dayOfMonth}${task.dayOfMonth === 1 ? "st" : task.dayOfMonth === 2 ? "nd" : task.dayOfMonth === 3 ? "rd" : "th"}`
                        : dayLabel[task.dayOfWeek ?? 1]}
                    </Badge>
                    {task.client && <span className="text-xs text-muted-foreground">{task.client}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={isPending}
                    onClick={() => startTransition(() => updateRecurringTask(task.id, { isActive: !task.isActive }))}
                    title={task.isActive ? "Pause" : "Resume"}
                  >
                    {task.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <RecurringTaskDialog
                    task={task}
                    clientOptions={clientOptions}
                    categoryOptions={categoryOptions}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Pencil className="h-3 w-3" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    disabled={isPending}
                    onClick={() => {
                      if (confirm("Delete this recurring task?")) {
                        startTransition(() => deleteRecurringTask(task.id));
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
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
