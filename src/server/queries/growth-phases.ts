import { db } from "@/db";
import { growthPhases } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function getActivePhase() {
  const result = await db
    .select()
    .from(growthPhases)
    .where(eq(growthPhases.isActive, true))
    .limit(1);
  return result[0] ?? null;
}

export async function getActiveGoals() {
  const active = await db
    .select()
    .from(growthPhases)
    .where(eq(growthPhases.isActive, true))
    .orderBy(asc(growthPhases.timeframe));
  const goal90 = active.find((p) => p.timeframe === "90_day") ?? null;
  const goal180 = active.find((p) => p.timeframe === "180_day") ?? null;
  return { goal90, goal180 };
}

export async function getAllPhases() {
  return db.select().from(growthPhases).orderBy(asc(growthPhases.timeframe), asc(growthPhases.sortOrder));
}
