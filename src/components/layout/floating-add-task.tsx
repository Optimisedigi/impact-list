"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { STATUS_OPTIONS, TO_COMPLETE_OPTIONS, buildCategoryOptions } from "@/lib/constants";
import type { CategoryOption } from "@/lib/constants";
import { getAllCategories } from "@/server/actions/categories";
import { createTask } from "@/server/actions/tasks";
import { createTimeEntry } from "@/server/actions/time-entries";
import { createDailyLog } from "@/server/actions/daily-logs";
import { getAllClients } from "@/server/actions/clients";
import { todayLocalISO } from "@/lib/time-utils";
import { Plus, Trash2 } from "lucide-react";
import { SmartTaskInput } from "@/components/ui/voice-input-button";

type DayHoursMode = "sections" | "total";

type WorkSection = {
  id: string;
  start: string;
  end: string;
};

const defaultSectionCount = 3;

function emptyWorkSection(id: string): WorkSection {
  return { id, start: "", end: "" };
}

function createEmptySections(count: number): WorkSection[] {
  return Array.from({ length: count }, (_, index) => emptyWorkSection(`section-${index + 1}`));
}

function timeToMinutes(value: string): number | null {
  const [hourPart, minutePart] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
}

function calculateSectionHours(sections: readonly WorkSection[]): number {
  const totalMinutes = sections.reduce((total, section) => {
    const start = timeToMinutes(section.start);
    const end = timeToMinutes(section.end);

    if (start == null || end == null || start === end) return total;

    const duration = end > start ? end - start : end + 24 * 60 - start;
    return total + duration;
  }, 0);

  return Math.round((totalMinutes / 60) * 100) / 100;
}

function formatHours(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1),
  status: z.enum(["not_started", "in_progress", "done"]),
  toComplete: z.string().optional(),
  client: z.string().optional(),
  deadline: z.string().optional(),
  estimatedHours: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

const logWorkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1),
  client: z.string().optional(),
  hoursSpent: z.string().min(1, "Hours required"),
  date: z.string().min(1),
  note: z.string().optional(),
});

type LogWorkFormData = z.infer<typeof logWorkSchema>;

const dayHoursSchema = z.object({
  date: z.string().min(1),
  hours: z.string().optional(),
  note: z.string().optional(),
});

type DayHoursFormData = z.infer<typeof dayHoursSchema>;

import { usePathname } from "next/navigation";

export function FloatingAddTask() {
  const pathname = usePathname();
  // Hide on task detail pages (mobile form overlap)
  if (pathname.startsWith("/tasks/")) return null;
  
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<string[]>([]);
  const [catOptions, setCatOptions] = useState<CategoryOption[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { status: "not_started", category: "client_delivery" },
  });

  const logForm = useForm<LogWorkFormData>({
    resolver: zodResolver(logWorkSchema),
    defaultValues: {
      category: "client_delivery",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const dayHoursForm = useForm<DayHoursFormData>({
    resolver: zodResolver(dayHoursSchema),
    defaultValues: {
      date: todayLocalISO(),
    },
  });
  const [dayHoursError, setDayHoursError] = useState<string | null>(null);
  const [dayHoursMode, setDayHoursMode] = useState<DayHoursMode>("sections");
  const [daySections, setDaySections] = useState<WorkSection[]>(createEmptySections(defaultSectionCount));
  const [nextDaySectionId, setNextDaySectionId] = useState(defaultSectionCount + 1);
  const daySectionHours = calculateSectionHours(daySections);

  function handleVoiceResult(parsed: Record<string, unknown>) {
    if (parsed.title) setValue("title", String(parsed.title));
    if (parsed.category) setValue("category", parsed.category as TaskFormData["category"]);
    if (parsed.status) setValue("status", parsed.status as TaskFormData["status"]);
    if (parsed.client) setValue("client", String(parsed.client));
    if (parsed.deadline) setValue("deadline", String(parsed.deadline));
    if (parsed.estimatedHours) setValue("estimatedHours", String(parsed.estimatedHours));
    if (parsed.toComplete) setValue("toComplete", String(parsed.toComplete));
    setVoiceError(null);
  }

  useEffect(() => {
    if (open) {
      getAllClients().then((c) => setClients(c.map((cl) => cl.name)));
      getAllCategories().then((cats) => setCatOptions(buildCategoryOptions(cats)));
    }
  }, [open]);

  async function onSubmit(data: TaskFormData) {
    await createTask({
      title: data.title,
      category: data.category,
      status: data.status,
      toComplete: data.toComplete || null,
      client: data.client || null,
      deadline: data.deadline || null,
      estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : null,
      description: null,
    });
    reset();
    setOpen(false);
  }

  async function onLogWorkSubmit(data: LogWorkFormData) {
    const hours = Number(data.hoursSpent);
    const task = await createTask({
      title: data.title,
      category: data.category,
      status: "done",
      completedAt: new Date().toISOString(),
      actualHours: hours,
      client: data.client || null,
      toComplete: null,
      deadline: null,
      estimatedHours: null,
      description: null,
    });
    await createTimeEntry({
      taskId: task.id,
      hours,
      date: data.date,
      note: data.note || undefined,
    });
    logForm.reset({
      category: "client_delivery",
      date: new Date().toISOString().split("T")[0],
    });
    setOpen(false);
  }

  function updateDaySection(id: string, field: "start" | "end", value: string) {
    setDaySections((currentSections) =>
      currentSections.map((section) => (section.id === id ? { ...section, [field]: value } : section)),
    );
  }

  function addDaySection() {
    setDaySections((currentSections) => [...currentSections, emptyWorkSection(`section-${nextDaySectionId}`)]);
    setNextDaySectionId((currentId) => currentId + 1);
  }

  function removeDaySection(id: string) {
    setDaySections((currentSections) => {
      if (currentSections.length === 1) return currentSections;
      return currentSections.filter((section) => section.id !== id);
    });
  }

  async function onLogDayHoursSubmit(data: DayHoursFormData) {
    setDayHoursError(null);
    const hours = dayHoursMode === "sections" ? daySectionHours : Number(data.hours);

    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      setDayHoursError(dayHoursMode === "sections" ? "Enter at least one start and end time." : "Enter hours between 0 and 24.");
      return;
    }

    const result = await createDailyLog({
      date: data.date,
      hours,
      category: null,
      note: data.note || null,
    });
    if (!result.ok) {
      setDayHoursError(result.error);
      return;
    }
    dayHoursForm.reset({ date: todayLocalISO() });
    setDaySections(createEmptySections(defaultSectionCount));
    setNextDaySectionId(defaultSectionCount + 1);
    setOpen(false);
  }

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Add</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="new">
            <TabsList className="w-full">
              <TabsTrigger value="new" className="flex-1">New Task</TabsTrigger>
              <TabsTrigger value="log" className="flex-1">Log Work Done</TabsTrigger>
              <TabsTrigger value="day" className="flex-1">Log Day Hours</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4 mt-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Quick add with AI</Label>
                <SmartTaskInput
                  onResult={handleVoiceResult}
                  onError={setVoiceError}
                />
                {voiceError && (
                  <p className="text-xs text-destructive">{voiceError}</p>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or fill in manually</span></div>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="fab-title">Title</Label>
                  <Input id="fab-title" {...register("title")} />
                  {errors.title && (
                    <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select
                      defaultValue="client_delivery"
                      onValueChange={(v) => setValue("category", v as TaskFormData["category"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {catOptions.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select
                      defaultValue="not_started"
                      onValueChange={(v) => setValue("status", v as TaskFormData["status"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Client</Label>
                    {clients.length > 0 ? (
                      <Select onValueChange={(v) => setValue("client", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input {...register("client")} placeholder="Client name" />
                    )}
                  </div>
                  <div>
                    <Label>Deadline</Label>
                    <Input type="date" {...register("deadline")} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>To Complete</Label>
                    <Select onValueChange={(v) => setValue("toComplete", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        {TO_COMPLETE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Est. Hours</Label>
                    <Input type="number" step="0.5" {...register("estimatedHours")} />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Adding..." : "Add Task"}
                  </Button>
                </div>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-1">
                For recurring tasks, <a href="/settings" className="underline hover:text-foreground">add in Settings</a>
              </p>
            </TabsContent>

            <TabsContent value="log" className="mt-4">
              <form onSubmit={logForm.handleSubmit(onLogWorkSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="log-title">What did you work on?</Label>
                  <Input id="log-title" {...logForm.register("title")} placeholder="e.g. Updated client proposal" />
                  {logForm.formState.errors.title && (
                    <p className="mt-1 text-xs text-destructive">{logForm.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select
                      defaultValue="client_delivery"
                      onValueChange={(v) => logForm.setValue("category", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {catOptions.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Client</Label>
                    {clients.length > 0 ? (
                      <Select onValueChange={(v) => logForm.setValue("client", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input {...logForm.register("client")} placeholder="Client name" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="log-hours">Hours Spent</Label>
                    <Input id="log-hours" type="number" step="0.25" min="0.25" {...logForm.register("hoursSpent")} placeholder="e.g. 1.5" />
                    {logForm.formState.errors.hoursSpent && (
                      <p className="mt-1 text-xs text-destructive">{logForm.formState.errors.hoursSpent.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="log-date">Date</Label>
                    <Input id="log-date" type="date" {...logForm.register("date")} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="log-note">Note (optional)</Label>
                  <Input id="log-note" {...logForm.register("note")} placeholder="What was done..." />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={logForm.formState.isSubmitting}>
                    {logForm.formState.isSubmitting ? "Logging..." : "Log Work"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="day" className="mt-4">
              <p className="mb-4 text-xs text-muted-foreground">
                Log a daily total of hours worked. Enter start/end sections and breaks are calculated for you.
              </p>
              <form onSubmit={dayHoursForm.handleSubmit(onLogDayHoursSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 rounded-lg border border-border bg-muted/30 p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => setDayHoursMode("sections")}
                    className={`rounded-md px-3 py-1.5 transition-colors ${
                      dayHoursMode === "sections" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Start/end times
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayHoursMode("total")}
                    className={`rounded-md px-3 py-1.5 transition-colors ${
                      dayHoursMode === "total" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Enter total
                  </button>
                </div>

                {dayHoursMode === "sections" ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {daySections.map((section, index) => (
                        <div key={section.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                          <Input
                            type="time"
                            value={section.start}
                            onChange={(e) => updateDaySection(section.id, "start", e.target.value)}
                            aria-label={`Work section ${index + 1} start time`}
                            className="min-w-0 tabular-nums"
                          />
                          <span className="text-xs text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={section.end}
                            onChange={(e) => updateDaySection(section.id, "end", e.target.value)}
                            aria-label={`Work section ${index + 1} end time`}
                            className="min-w-0 tabular-nums"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDaySection(section.id)}
                            disabled={daySections.length === 1}
                            className="h-9 w-9 text-muted-foreground"
                            title="Remove section"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={addDaySection}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add section
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Total: <span className="font-medium text-foreground">{formatHours(daySectionHours)}h</span>
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Example: 10:30–13:00 and 14:00–22:00 logs 10.5h.
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="day-hours">Hours</Label>
                    <Input id="day-hours" type="number" step="0.25" min="0.25" max="24" {...dayHoursForm.register("hours")} placeholder="e.g. 8.5" />
                  </div>
                )}

                <div>
                  <Label htmlFor="day-date">Date</Label>
                  <Input id="day-date" type="date" {...dayHoursForm.register("date")} />
                </div>

                <div>
                  <Label htmlFor="day-note">Note (optional)</Label>
                  <Input id="day-note" {...dayHoursForm.register("note")} placeholder="What did you work on?" />
                </div>

                {dayHoursError && <p className="text-xs text-destructive">{dayHoursError}</p>}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={dayHoursForm.formState.isSubmitting}>
                    {dayHoursForm.formState.isSubmitting ? "Logging..." : "Log Day Hours"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
