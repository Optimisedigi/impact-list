"use server";

import { db } from "@/db";
import { lifeWeeksSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface LifeWeeksSettingsData {
  dateOfBirth: string;
  lifeExpectancyYears: number;
}

export async function getLifeWeeksSettings(): Promise<LifeWeeksSettingsData | null> {
  const rows = await db.select().from(lifeWeeksSettings).limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];
  return { dateOfBirth: row.dateOfBirth, lifeExpectancyYears: row.lifeExpectancyYears };
}

export async function saveLifeWeeksSettings(data: LifeWeeksSettingsData) {
  if (!data.dateOfBirth || Number.isNaN(Date.parse(data.dateOfBirth))) {
    throw new Error("Invalid date of birth");
  }
  if (!Number.isFinite(data.lifeExpectancyYears) || data.lifeExpectancyYears <= 0 || data.lifeExpectancyYears > 130) {
    throw new Error("Invalid life expectancy");
  }

  const existing = await db.select().from(lifeWeeksSettings).limit(1);
  if (existing.length > 0) {
    await db
      .update(lifeWeeksSettings)
      .set({
        dateOfBirth: data.dateOfBirth,
        lifeExpectancyYears: data.lifeExpectancyYears,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(lifeWeeksSettings.id, existing[0].id));
  } else {
    await db.insert(lifeWeeksSettings).values({
      dateOfBirth: data.dateOfBirth,
      lifeExpectancyYears: data.lifeExpectancyYears,
    });
  }

  revalidatePath("/life-weeks");
}
