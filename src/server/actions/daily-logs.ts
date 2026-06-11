"use server";

import { db } from "@/db";
import { dailyTimeLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { DailyTimeLog } from "@/types";

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validateHours(hours: number): string | null {
  if (typeof hours !== "number" || !Number.isFinite(hours)) {
    return "Hours must be a number.";
  }
  if (hours <= 0) return "Hours must be greater than 0.";
  if (hours > 24) return "Hours cannot exceed 24 in a single day.";
  return null;
}

function validateDate(date: string): string | null {
  if (!date || !DATE_PATTERN.test(date)) {
    return "Date must be in YYYY-MM-DD format.";
  }
  return null;
}

function revalidate(): void {
  revalidatePath("/analytics");
}

export async function createDailyLog(data: {
  date: string;
  hours: number;
  category?: string | null;
  note?: string | null;
}): Promise<Result<DailyTimeLog>> {
  const dateError = validateDate(data.date);
  if (dateError) return { ok: false, error: dateError };
  const hoursError = validateHours(data.hours);
  if (hoursError) return { ok: false, error: hoursError };

  const result = await db
    .insert(dailyTimeLogs)
    .values({
      date: data.date,
      hours: data.hours,
      category: data.category ?? null,
      note: data.note ?? null,
    })
    .returning();

  revalidate();
  return { ok: true, value: result[0] };
}

export async function updateDailyLog(
  id: number,
  data: Partial<{ date: string; hours: number; category: string | null; note: string | null }>
): Promise<Result<DailyTimeLog>> {
  if (data.date !== undefined) {
    const dateError = validateDate(data.date);
    if (dateError) return { ok: false, error: dateError };
  }
  if (data.hours !== undefined) {
    const hoursError = validateHours(data.hours);
    if (hoursError) return { ok: false, error: hoursError };
  }

  const result = await db
    .update(dailyTimeLogs)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(dailyTimeLogs.id, id))
    .returning();

  if (result.length === 0) {
    return { ok: false, error: "Daily log not found." };
  }

  revalidate();
  return { ok: true, value: result[0] };
}

export async function deleteDailyLog(id: number): Promise<Result<number>> {
  const result = await db
    .delete(dailyTimeLogs)
    .where(eq(dailyTimeLogs.id, id))
    .returning({ id: dailyTimeLogs.id });

  if (result.length === 0) {
    return { ok: false, error: "Daily log not found." };
  }

  revalidate();
  return { ok: true, value: result[0].id };
}
