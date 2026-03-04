"use server";

import { db } from "@/db";
import { weeklyPriorities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getWeekBounds } from "@/lib/time-utils";

function getCurrentWeekStart() {
  const { start } = getWeekBounds(0);
  return start.split("T")[0];
}

export async function getWeeklyPriorities() {
  const weekStart = getCurrentWeekStart();
  const result = await db
    .select()
    .from(weeklyPriorities)
    .where(eq(weeklyPriorities.weekStart, weekStart))
    .limit(1);
  return result[0] ?? null;
}

export async function saveWeeklyPriorities(priorities: string) {
  const weekStart = getCurrentWeekStart();
  const existing = await db
    .select()
    .from(weeklyPriorities)
    .where(eq(weeklyPriorities.weekStart, weekStart))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(weeklyPriorities)
      .set({ priorities, updatedAt: new Date().toISOString() })
      .where(eq(weeklyPriorities.weekStart, weekStart));
  } else {
    await db.insert(weeklyPriorities).values({ weekStart, priorities });
  }

  revalidatePath("/focus");
}
