"use server";

import { db } from "@/db";
import { categoryTargets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getCurrentTargets() {
  return db.select().from(categoryTargets);
}

export async function upsertCategoryTargets(
  targets: { category: string; targetPercentage: number }[]
) {
  const sum = targets.reduce((s, t) => s + t.targetPercentage, 0);
  if (sum !== 100) {
    throw new Error(`Targets must sum to 100%, got ${sum}%`);
  }

  for (const t of targets) {
    const existing = await db
      .select()
      .from(categoryTargets)
      .where(eq(categoryTargets.category, t.category as typeof categoryTargets.category.enumValues[number]));

    if (existing.length > 0) {
      await db
        .update(categoryTargets)
        .set({
          targetPercentage: t.targetPercentage,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(categoryTargets.category, t.category as typeof categoryTargets.category.enumValues[number]));
    } else {
      await db.insert(categoryTargets).values({
        category: t.category as typeof categoryTargets.category.enumValues[number],
        targetPercentage: t.targetPercentage,
      });
    }
  }

  revalidatePath("/settings");
  revalidatePath("/focus");
}
