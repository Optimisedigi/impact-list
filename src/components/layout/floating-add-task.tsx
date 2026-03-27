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
import { getAllClients } from "@/server/actions/clients";
import { Plus } from "lucide-react";
import { SmartTaskInput } from "@/components/ui/voice-input-button";

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

export function FloatingAddTask() {
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
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
