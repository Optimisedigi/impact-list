"use server";

import { db } from "@/db";
import { recurringTasks, tasks } from "@/db/schema";
import { eq, and, lte, gte, ne, isNull, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getWeekBounds } from "@/lib/time-utils";

export async function getAllRecurringTasks() {
  return db.select().from(recurringTasks).orderBy(recurringTasks.title);
}

export async function createRecurringTask(data: {
  title: string;
  description?: string | null;
  category: string;
  client?: string | null;
  estimatedHours?: number | null;
  frequency: string;
  dayOfWeek?: number;
  dayOfMonth?: number | null;
}) {
  const result = await db.insert(recurringTasks).values({
    title: data.title,
    description: data.description ?? null,
    category: data.category as "client_delivery" | "systems_automation" | "client_growth" | "team_management" | "admin",
    client: data.client ?? null,
    estimatedHours: data.estimatedHours ?? null,
    frequency: data.frequency as "weekly" | "fortnightly" | "monthly",
    dayOfWeek: data.dayOfWeek ?? 1,
    dayOfMonth: data.dayOfMonth ?? null,
  }).returning();
  revalidatePath("/settings");
  return result[0];
}

export async function updateRecurringTask(
  id: number,
  data: Partial<{
    title: string;
    description: string | null;
    category: string;
    client: string | null;
    estimatedHours: number | null;
    frequency: string;
    dayOfWeek: number;
    dayOfMonth: number | null;
    isActive: boolean;
  }>
) {
  await db.update(recurringTasks).set(data as Record<string, unknown>).where(eq(recurringTasks.id, id));
  revalidatePath("/settings");
}

export async function deleteRecurringTask(id: number) {
  await db.delete(recurringTasks).where(eq(recurringTasks.id, id));
  revalidatePath("/settings");
}

/**
 * Calculate the next occurrence of a given day-of-week (1=Mon … 7=Sun).
 * If today IS that day, returns today.
 */
function nextDayOfWeek(dayOfWeek: number, from: Date = new Date()): Date {
  // JS: 0=Sun,1=Mon…6=Sat → convert our 1=Mon…7=Sun
  const jsDay = dayOfWeek % 7; // 1→1,2→2,…,7→0
  const current = from.getDay();
  let diff = jsDay - current;
  if (diff < 0) diff += 7;
  // If diff === 0 it's today — still return today so it shows up this week
  const result = new Date(from);
  result.setDate(result.getDate() + diff);
  return result;
}

function getToComplete(frequency: string, deadlineStr: string): "this_week" | null {
  // Show in focus only when the target date falls within the current week
  const { start, end } = getWeekBounds(0);
  const startDate = start.split("T")[0];
  const endDate = end.split("T")[0];
  return deadlineStr >= startDate && deadlineStr <= endDate ? "this_week" : null;
}

export async function generateRecurringTasks({ skipRevalidate = false }: { skipRevalidate?: boolean } = {}) {
  const now = new Date();

  const active = await db
    .select()
    .from(recurringTasks)
    .where(eq(recurringTasks.isActive, true));

  let created = 0;

  for (const rt of active) {
    // Check if we need to generate based on frequency
    const lastGenerated = rt.lastGeneratedAt ? new Date(rt.lastGeneratedAt) : null;

    let shouldGenerate = false;

    if (!lastGenerated) {
      shouldGenerate = true;
    } else {
      const daysSince = Math.floor((now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60 * 24));
      switch (rt.frequency) {
        case "weekly":
          shouldGenerate = daysSince >= 7;
          break;
        case "fortnightly":
          shouldGenerate = daysSince >= 14;
          break;
        case "monthly":
          shouldGenerate = daysSince >= 28;
          break;
      }
    }

    if (shouldGenerate) {
      // Skip if there's already an open (not done) task for this recurring task
      const existingOpen = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            eq(tasks.recurringTaskId, rt.id),
            ne(tasks.status, "done")
          )
        )
        .limit(1);
      if (existingOpen.length > 0) {
        // Update lastGeneratedAt so we don't keep checking
        await db
          .update(recurringTasks)
          .set({ lastGeneratedAt: now.toISOString() })
          .where(eq(recurringTasks.id, rt.id));
        continue;
      }

      // Calculate deadline based on frequency, using the configured day
      let deadline: Date;
      switch (rt.frequency) {
        case "weekly":
          deadline = nextDayOfWeek(rt.dayOfWeek ?? 1, now);
          // If today is the target day, it's for this week; otherwise next occurrence
          if (deadline.toISOString().split("T")[0] === now.toISOString().split("T")[0]) {
            // Today is the day — keep it
          }
          break;
        case "fortnightly": {
          deadline = nextDayOfWeek(rt.dayOfWeek ?? 1, now);
          // Push to next week's occurrence (14 days from last, or at least 7 days out)
          if (deadline.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
            deadline.setDate(deadline.getDate() + 7);
          }
          break;
        }
        case "monthly":
        default:
          deadline = new Date(now);
          if (rt.dayOfMonth) {
            deadline.setMonth(deadline.getMonth() + 1);
            const lastDay = new Date(deadline.getFullYear(), deadline.getMonth() + 1, 0).getDate();
            deadline.setDate(Math.min(rt.dayOfMonth, lastDay));
          } else {
            deadline.setMonth(deadline.getMonth() + 1);
          }
          break;
      }

      const deadlineStr = deadline.toISOString().split("T")[0];
      await db.insert(tasks).values({
        title: rt.title,
        description: rt.description,
        category: rt.category,
        status: "not_started",
        client: rt.client,
        estimatedHours: rt.estimatedHours,
        deadline: deadlineStr,
        toComplete: getToComplete(rt.frequency, deadlineStr),
        recurringTaskId: rt.id,
      });

      await db
        .update(recurringTasks)
        .set({ lastGeneratedAt: now.toISOString() })
        .where(eq(recurringTasks.id, rt.id));

      created++;
    }
  }

  // Promote recurring tasks whose deadline is now within the current week
  const { start, end } = getWeekBounds(0);
  const weekStart = start.split("T")[0];
  const weekEnd = end.split("T")[0];
  await db
    .update(tasks)
    .set({ toComplete: "this_week" })
    .where(
      and(
        isNotNull(tasks.recurringTaskId),
        ne(tasks.status, "done"),
        isNull(tasks.dismissedFromFocus),
        isNull(tasks.toComplete),
        gte(tasks.deadline, weekStart),
        lte(tasks.deadline, weekEnd)
      )
    );

  if (!skipRevalidate) {
    revalidatePath("/tasks");
    revalidatePath("/focus");
  }
  return { created };
}

/**
 * Immediately generate the next instance of a recurring task
 * (called when a recurring task instance is marked done).
 */
export async function regenerateRecurringTask(recurringTaskId: number) {
  const [rt] = await db
    .select()
    .from(recurringTasks)
    .where(and(eq(recurringTasks.id, recurringTaskId), eq(recurringTasks.isActive, true)));

  if (!rt) return;

  // Skip if there's already an open (not done) task for this recurring task
  const existingOpen = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.recurringTaskId, rt.id),
        ne(tasks.status, "done")
      )
    )
    .limit(1);
  if (existingOpen.length > 0) return;

  const now = new Date();
  let deadline: Date;

  switch (rt.frequency) {
    case "weekly": {
      deadline = nextDayOfWeek(rt.dayOfWeek ?? 1, now);
      // If completing on the same day it's due, push to next week
      if (deadline.toISOString().split("T")[0] === now.toISOString().split("T")[0]) {
        deadline.setDate(deadline.getDate() + 7);
      }
      break;
    }
    case "fortnightly": {
      deadline = nextDayOfWeek(rt.dayOfWeek ?? 1, now);
      // Ensure at least 7 days out for fortnightly
      if (deadline.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
        deadline.setDate(deadline.getDate() + 7);
      }
      break;
    }
    case "monthly":
    default:
      deadline = new Date(now);
      if (rt.dayOfMonth) {
        deadline.setMonth(deadline.getMonth() + 1);
        const lastDay = new Date(deadline.getFullYear(), deadline.getMonth() + 1, 0).getDate();
        deadline.setDate(Math.min(rt.dayOfMonth, lastDay));
      } else {
        deadline.setMonth(deadline.getMonth() + 1);
      }
      break;
  }

  const deadlineStr = deadline.toISOString().split("T")[0];
  await db.insert(tasks).values({
    title: rt.title,
    description: rt.description,
    category: rt.category,
    status: "not_started",
    client: rt.client,
    estimatedHours: rt.estimatedHours,
    deadline: deadlineStr,
    toComplete: getToComplete(rt.frequency, deadlineStr),
    recurringTaskId: rt.id,
  });

  await db
    .update(recurringTasks)
    .set({ lastGeneratedAt: now.toISOString() })
    .where(eq(recurringTasks.id, rt.id));
}
