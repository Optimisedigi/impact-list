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
import { CATEGORY_OPTIONS, STATUS_OPTIONS, TO_COMPLETE_OPTIONS } from "@/lib/constants";
import { createTask } from "@/server/actions/tasks";
import { getAllClients } from "@/server/actions/clients";
import { Plus } from "lucide-react";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["client_delivery", "systems_automation", "client_growth", "team_management", "admin"]),
  status: z.enum(["not_started", "in_progress", "done"]),
  toComplete: z.string().optional(),
  client: z.string().optional(),
  deadline: z.string().optional(),
  estimatedHours: z.number().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

export function FloatingAddTask() {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<string[]>([]);
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

  useEffect(() => {
    if (open) {
      getAllClients().then((c) => setClients(c.map((cl) => cl.name)));
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
      estimatedHours: data.estimatedHours ?? null,
      description: null,
    });
    reset();
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
            <DialogTitle>Quick Add Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="fab-title">Title</Label>
              <Input id="fab-title" {...register("title")} />
              {errors.title && (
                <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                    {CATEGORY_OPTIONS.map((c) => (
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

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
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
        </DialogContent>
      </Dialog>
    </>
  );
}
