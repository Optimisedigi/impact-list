import { db } from "@/db";
import { sql } from "drizzle-orm";

const duplicateColumnMarkers = ["duplicate column", "already exists"];

function errorMessages(error: unknown): string[] {
  if (!(error instanceof Error)) return [String(error).toLowerCase()];
  const messages = [error.message.toLowerCase()];
  let cause = error.cause;
  while (cause) {
    if (cause instanceof Error) {
      messages.push(cause.message.toLowerCase());
      cause = cause.cause;
    } else {
      messages.push(String(cause).toLowerCase());
      break;
    }
  }
  return messages;
}

async function addColumnIfMissing(statement: string): Promise<void> {
  try {
    await db.run(sql.raw(statement));
  } catch (error) {
    const messages = errorMessages(error);
    if (!duplicateColumnMarkers.some((marker) => messages.some((message) => message.includes(marker)))) {
      throw error;
    }
  }
}

export async function ensureTimelineColumns(): Promise<void> {
  await addColumnIfMissing("ALTER TABLE tasks ADD COLUMN timeline_start text");
  await addColumnIfMissing("ALTER TABLE tasks ADD COLUMN timeline_end text");
  await addColumnIfMissing("ALTER TABLE tasks ADD COLUMN show_on_timeline integer DEFAULT 0");
}
