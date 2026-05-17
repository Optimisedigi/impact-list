"use server";

import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { revalidatePath } from "next/cache";
import type { NewCalendarEvent } from "@/types";
import {
  parseImportCsv,
  type ImportFormat,
  type ImportPreviewEvent,
} from "@/lib/calendar/csv-parsers";

export interface ImportResult {
  success: boolean;
  format?: ImportFormat;
  imported?: number;
  skipped?: number;
  errors?: string[];
  preview?: ImportPreviewEvent[];
  error?: string;
}

export async function previewImport(
  csvText: string,
  year: number,
): Promise<ImportResult> {
  try {
    const { format, events } = parseImportCsv(csvText, year);
    return {
      success: true,
      format,
      preview: events.slice(0, 20),
      imported: 0,
      skipped: 0,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function importEventsCsv(
  csvText: string,
  year: number,
): Promise<ImportResult> {
  try {
    const { format, events } = parseImportCsv(csvText, year);

    let imported = 0;
    const errors: string[] = [];
    for (const ev of events) {
      try {
        const payload: NewCalendarEvent = {
          title: ev.title,
          description: ev.description ?? null,
          location: ev.location ?? null,
          startsAt: ev.startsAt,
          endsAt: ev.endsAt,
          allDay: ev.allDay,
          color: ev.color ?? null,
          source: "local",
        };
        await db.insert(calendarEvents).values(payload);
        imported++;
      } catch (e) {
        errors.push(
          `${ev.title} (${ev.startsAt}): ${e instanceof Error ? e.message : "error"}`,
        );
      }
    }

    revalidatePath("/calendar");
    return {
      success: true,
      format,
      imported,
      skipped: events.length - imported,
      errors,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
