"use server";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { revalidatePath } from "next/cache";

const CATEGORY_MAP: Record<string, string> = {
  "client delivery": "client_delivery",
  "client_delivery": "client_delivery",
  "systems & automation": "systems_automation",
  "systems_automation": "systems_automation",
  "systems and automation": "systems_automation",
  "client growth work": "client_growth",
  "client_growth": "client_growth",
  "client growth": "client_growth",
  "team management": "team_management",
  "team_management": "team_management",
  admin: "admin",
};

const STATUS_MAP: Record<string, string> = {
  "not started": "not_started",
  "not_started": "not_started",
  "": "not_started",
  "in progress": "in_progress",
  "in_progress": "in_progress",
  done: "done",
  completed: "done",
};

const TO_COMPLETE_MAP: Record<string, string> = {
  today: "today",
  "next 2 days": "next_2_days",
  "next_2_days": "next_2_days",
  "this week": "this_week",
  "this_week": "this_week",
};

const COLUMN_MAP: Record<string, string> = {
  title: "title",
  task: "title",
  "task name": "title",
  name: "title",
  description: "description",
  desc: "description",
  category: "category",
  status: "status",
  "to complete": "toComplete",
  tocomplete: "toComplete",
  "next step": "toComplete",
  client: "client",
  deadline: "deadline",
  "due date": "deadline",
  due: "deadline",
  "estimated hours": "estimatedHours",
  "est hours": "estimatedHours",
  "est. hours": "estimatedHours",
  estimate: "estimatedHours",
  "actual hours": "actualHours",
  "actual": "actualHours",
  "priority score": "priorityScore",
  priority: "priorityScore",
  "leverage score": "leverageScore",
  leverage: "leverageScore",
};

export async function importCsv(csvText: string) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return { success: false, error: "CSV must have a header row and at least one data row" };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

  const mappedHeaders = headers.map((h) => COLUMN_MAP[h] || h);

  const titleIndex = mappedHeaders.indexOf("title");
  if (titleIndex === -1) {
    return { success: false, error: "CSV must have a 'Title' or 'Task' column" };
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (!values || values.length === 0) { skipped++; continue; }

    const row: Record<string, string> = {};
    mappedHeaders.forEach((header, idx) => {
      if (values[idx] !== undefined) {
        row[header] = values[idx].trim();
      }
    });

    if (!row.title) { skipped++; continue; }

    try {
      const category = CATEGORY_MAP[(row.category || "").toLowerCase()] || "client_delivery";
      const status = STATUS_MAP[(row.status || "").toLowerCase()] || "not_started";
      const toComplete = TO_COMPLETE_MAP[(row.toComplete || "").toLowerCase()] || row.toComplete || null;

      await db.insert(tasks).values({
        title: row.title,
        description: row.description || null,
        category: category as "client_delivery" | "systems_automation" | "client_growth" | "team_management" | "admin",
        status: status as "not_started" | "in_progress" | "done",
        toComplete,
        client: row.client || null,
        deadline: row.deadline || null,
        estimatedHours: row.estimatedHours ? Number(row.estimatedHours) : null,
        actualHours: row.actualHours ? Number(row.actualHours) : null,
        priorityScore: row.priorityScore ? Number(row.priorityScore) : null,
        leverageScore: row.leverageScore ? Number(row.leverageScore) : null,
      });
      imported++;
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : "Unknown error"}`);
      skipped++;
    }
  }

  revalidatePath("/tasks");
  revalidatePath("/focus");

  return { success: true, imported, skipped, errors };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
