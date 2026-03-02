"use server";

import { db } from "@/db";
import { growthPhases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createPhase(data: {
  name: string;
  description?: string;
  focusAreas?: string;
}) {
  const result = await db
    .insert(growthPhases)
    .values({
      name: data.name,
      description: data.description || null,
      focusAreas: data.focusAreas || null,
    })
    .returning();
  revalidatePath("/settings");
  return result[0];
}

export async function updatePhase(
  id: number,
  data: { name?: string; description?: string; focusAreas?: string }
) {
  const result = await db
    .update(growthPhases)
    .set(data)
    .where(eq(growthPhases.id, id))
    .returning();
  revalidatePath("/settings");
  revalidatePath("/focus");
  return result[0];
}

export async function setActivePhase(id: number) {
  // Deactivate all phases
  await db.update(growthPhases).set({ isActive: false });
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
