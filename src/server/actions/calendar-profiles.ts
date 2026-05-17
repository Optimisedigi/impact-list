"use server";

import { db } from "@/db";
import { calendarProfiles, calendarSubscriptions } from "@/db/schema";
import { eq, max, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createProfile(name: string, colorKey: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Profile name is required");
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(calendarProfiles.sortOrder) })
    .from(calendarProfiles);
  await db.insert(calendarProfiles).values({
    name: trimmed,
    colorKey,
    sortOrder: (maxOrder ?? 0) + 1,
  });
  revalidatePath("/settings/calendar-profiles");
  revalidatePath("/calendar");
}

export async function updateProfile(
  id: number,
  data: { name?: string; colorKey?: string; visibleByDefault?: boolean },
) {
  const patch: {
    name?: string;
    colorKey?: string;
    visibleByDefault?: boolean;
  } = {};
  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (!trimmed) throw new Error("Profile name cannot be empty");
    patch.name = trimmed;
  }
  if (data.colorKey !== undefined) patch.colorKey = data.colorKey;
  if (data.visibleByDefault !== undefined)
    patch.visibleByDefault = data.visibleByDefault;
  if (Object.keys(patch).length === 0) return;
  await db.update(calendarProfiles).set(patch).where(eq(calendarProfiles.id, id));
  revalidatePath("/settings/calendar-profiles");
  revalidatePath("/calendar");
}

export async function setDefaultProfile(id: number) {
  // Only one default at a time.
  await db
    .update(calendarProfiles)
    .set({ isDefault: false })
    .where(ne(calendarProfiles.id, id));
  await db
    .update(calendarProfiles)
    .set({ isDefault: true })
    .where(eq(calendarProfiles.id, id));
  revalidatePath("/settings/calendar-profiles");
  revalidatePath("/calendar");
}

export async function deleteProfile(id: number) {
  await db.delete(calendarProfiles).where(eq(calendarProfiles.id, id));
  revalidatePath("/settings/calendar-profiles");
  revalidatePath("/calendar");
}

export async function setSubscriptionProfile(
  subscriptionId: number,
  profileId: number | null,
) {
  await db
    .update(calendarSubscriptions)
    .set({ profileId })
    .where(eq(calendarSubscriptions.id, subscriptionId));
  revalidatePath("/settings/calendar-accounts");
  revalidatePath("/calendar");
}
