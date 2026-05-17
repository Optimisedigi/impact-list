"use server";

import { db } from "@/db";
import { calendarColorLabels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { EVENT_COLORS } from "@/lib/constants";

const VALID_KEYS = new Set<string>(EVENT_COLORS.map((c) => c.key));

// Upsert a custom label for one palette key. Empty string reverts to default.
export async function setColorLabel(key: string, label: string): Promise<void> {
  if (!VALID_KEYS.has(key)) {
    throw new Error(`Unknown color key: ${key}`);
  }
  const trimmed = label.trim();
  const existing = await db
    .select()
    .from(calendarColorLabels)
    .where(eq(calendarColorLabels.key, key));

  if (trimmed === "") {
    if (existing[0]) {
      await db
        .delete(calendarColorLabels)
        .where(eq(calendarColorLabels.key, key));
    }
  } else if (existing[0]) {
    await db
      .update(calendarColorLabels)
      .set({ label: trimmed, updatedAt: new Date().toISOString() })
      .where(eq(calendarColorLabels.key, key));
  } else {
    await db.insert(calendarColorLabels).values({ key, label: trimmed });
  }

  revalidatePath("/calendar");
  revalidatePath("/settings");
}
