"use client";

import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { STATUS_OPTIONS, TO_COMPLETE_OPTIONS } from "@/lib/constants";
import type { CategoryOption } from "@/lib/constants";
import { createTask } from "@/server/actions/tasks";
import { Plus } from "lucide-react";
import { useState } from "react";
import { SmartTaskInput } from "@/components/ui/voice-input-button";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().min(1),
  status: z.enum(["not_started", "in_progress", "done"]),
  toComplete: z.string().optional(),
  client: z.string().optional(),
  deadline: z.string().optional(),
  estimatedHours: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

export function TaskForm({ clientOptions = [], categoryOptions = [] }: { clientOptions?: string[]; categoryOptions?: CategoryOption[] }) {
  const [open, setOpen] = useState(false);
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

  async function onSubmit(data: TaskFormData) {
    await createTask({
      title: data.title,
      description: data.description || null,
      category: data.category,
      status: data.status,
      toComplete: data.toComplete || null,
      client: data.client || null,
      deadline: data.deadline || null,
      estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : null,
    });
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
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
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select
                defaultValue={categoryOptions[0]?.value ?? "client_delivery"}
                onValueChange={(v) => setValue("category", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client</Label>
              {clientOptions.length > 0 ? (
                <Select onValueChange={(v) => setValue("client", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.map((c) => (
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
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="date" {...register("deadline")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>To Complete</Label>
              <Select
                onValueChange={(v) => setValue("toComplete", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
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
              <Label htmlFor="estimatedHours">Est. Hours</Label>
              <Input id="estimatedHours" type="number" step="0.5" {...register("estimatedHours")} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
