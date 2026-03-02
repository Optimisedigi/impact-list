import { db } from "@/db";
import { growthPhases } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getActivePhase() {
  const result = await db
    .select()
    .from(growthPhases)
    .where(eq(growthPhases.isActive, true))
    .limit(1);
  return result[0] ?? null;
}

export async function getAllPhases() {
  return db.select().from(growthPhases).orderBy(asc(growthPhases.sortOrder));
}
