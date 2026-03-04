"use server";

import { db } from "@/db";
import { growthPhases } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createPhase(data: {
  name: string;
  description?: string;
  focusAreas?: string;
  timeframe?: string;
}) {
  const result = await db
    .insert(growthPhases)
    .values({
      name: data.name,
      description: data.description || null,
      focusAreas: data.focusAreas || null,
      timeframe: (data.timeframe as "90_day" | "180_day") || "90_day",
    })
    .returning();
  revalidatePath("/settings");
  return result[0];
}

export async function updatePhase(
  id: number,
  data: { name?: string; description?: string; focusAreas?: string; timeframe?: string }
) {
  const { timeframe, ...rest } = data;
  const updates: Record<string, unknown> = { ...rest };
  if (timeframe) updates.timeframe = timeframe;
  const result = await db
    .update(growthPhases)
    .set(updates)
    .where(eq(growthPhases.id, id))
    .returning();
  revalidatePath("/settings");
  revalidatePath("/focus");
  return result[0];
}

export async function setActivePhase(id: number) {
  // Get the phase to know its timeframe
  const [phase] = await db.select().from(growthPhases).where(eq(growthPhases.id, id));
  if (!phase) return;

  // Deactivate only phases with the same timeframe (so you can have one active 90-day AND one active 180-day)
  await db
    .update(growthPhases)
    .set({ isActive: false })
    .where(eq(growthPhases.timeframe, phase.timeframe));

  // Activate the selected one
  await db
    .update(growthPhases)
    .set({ isActive: true })
    .where(eq(growthPhases.id, id));
  revalidatePath("/settings");
  revalidatePath("/focus");
}

export async function deletePhase(id: number) {
  await db.delete(growthPhases).where(eq(growthPhases.id, id));
  revalidatePath("/settings");
}
