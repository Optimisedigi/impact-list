import { db } from "@/db";
import { sql } from "drizzle-orm";

const duplicateColumnMarkers = ["duplicate column", "already exists"];

async function addColumnIfMissing(statement: string): Promise<void> {
  try {
    await db.run(sql.raw(statement));
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (!duplicateColumnMarkers.some((marker) => message.includes(marker))) {
      throw error;
    }
  }
}

export async function ensureTimelineColumns(): Promise<void> {
  await addColumnIfMissing("ALTER TABLE tasks ADD COLUMN timeline_start text");
  await addColumnIfMissing("ALTER TABLE tasks ADD COLUMN timeline_end text");
  await addColumnIfMissing("ALTER TABLE tasks ADD COLUMN show_on_timeline integer DEFAULT 0");
}
