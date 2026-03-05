/**
 * One-off backfill script: imports historical weekly time allocation data.
 * Reads directly from the user's CSV at ~/Desktop/Hours works from the beginning.csv
 *
 * Run:  npx tsx src/db/backfill-weekly-hours.ts
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { tasks, timeEntries } from "./schema";
import { readFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

const CATEGORY_MAP: Record<string, string> = {
  "Client Delivery": "client_delivery",
  "Systems & Automation": "systems_automation",
  "Client Growth Work": "client_growth",
  "Team Management": "team_management",
  "Admin": "admin",
};

function parseDate(mmddyyyy: string): string {
  const [mm, dd, yyyy] = mmddyyyy.split("/");
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

async function main() {
  const csvPath = resolve(homedir(), "Desktop", "Hours works from the beginning.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");

  // First row has dates starting at column 1
  const header = lines[0].split(",").map((h) => h.trim());
  const weekDates = header.slice(1).map(parseDate);

  console.log(`Found ${weekDates.length} weeks: ${weekDates.join(", ")}`);

  const client = createClient({ url: "file:./local.db" });
  const db = drizzle(client);

  let inserted = 0;

  // Parse rows 1-5 (category hours)
  for (let i = 1; i <= 5; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const categoryLabel = cols[0];
    const categoryKey = CATEGORY_MAP[categoryLabel];
    if (!categoryKey) {
      console.log(`Skipping unknown category: "${categoryLabel}"`);
      continue;
    }

    for (let w = 0; w < weekDates.length; w++) {
      const hours = parseFloat(cols[w + 1]);
      if (!hours || hours <= 0) continue;

      const weekStart = weekDates[w];

      const [task] = await db
        .insert(tasks)
        .values({
          title: `[Backfill] ${categoryLabel} — week of ${weekStart}`,
          category: categoryKey,
          status: "done",
          actualHours: hours,
          completedAt: weekStart,
          createdAt: weekStart,
          updatedAt: weekStart,
        })
        .returning({ id: tasks.id });

      await db.insert(timeEntries).values({
        taskId: task.id,
        hours,
        date: weekStart,
        note: "Backfilled historical data",
        createdAt: weekStart,
      });

      inserted++;
    }

    console.log(`✓ ${categoryLabel} (${categoryKey}) — done`);
  }

  console.log(`\nDone. Inserted ${inserted} task + time-entry pairs.`);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
