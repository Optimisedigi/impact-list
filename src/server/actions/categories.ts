"use server";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const DEFAULT_CATEGORIES = [
  { key: "client_delivery", label: "Client Delivery", color: "oklch(0.55 0.15 90)" },
  { key: "systems_automation", label: "Systems & Automation", color: "oklch(0.45 0.18 160)" },
  { key: "client_growth", label: "Client Growth Work", color: "oklch(0.48 0.18 250)" },
  { key: "team_management", label: "Team Management", color: "oklch(0.5 0.18 310)" },
  { key: "admin", label: "Admin", color: "oklch(0.45 0.03 260)" },
];

const COLOR_PALETTE = [
  "oklch(0.55 0.15 90)",
  "oklch(0.45 0.18 160)",
  "oklch(0.48 0.18 250)",
  "oklch(0.5 0.18 310)",
  "oklch(0.45 0.03 260)",
  "oklch(0.55 0.2 30)",
  "oklch(0.5 0.18 130)",
  "oklch(0.55 0.15 60)",
  "oklch(0.5 0.2 280)",
  "oklch(0.55 0.18 350)",
];

export async function getAllCategories() {
  const rows = await db.select().from(categories).orderBy(categories.sortOrder);
  if (rows.length === 0) {
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      await db.insert(categories).values({
        ...DEFAULT_CATEGORIES[i],
        sortOrder: i,
      });
    }
    return db.select().from(categories).orderBy(categories.sortOrder);
  }
  return rows;
}

function toKey(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export async function saveCategories(labels: string[]) {
  const existing = await db.select().from(categories);
  const existingByKey = new Map(existing.map((c) => [c.key, c]));
  const newKeys = new Set(labels.filter((l) => l.trim()).map(toKey));

  // Delete categories no longer in the list
  for (const cat of existing) {
    if (!newKeys.has(cat.key)) {
      await db.delete(categories).where(eq(categories.id, cat.id));
    }
  }

  // Add or update categories
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i].trim();
    if (!label) continue;
    const key = toKey(label);
    const existingCat = existingByKey.get(key);

    if (existingCat) {
      await db.update(categories).set({ label, sortOrder: i }).where(eq(categories.id, existingCat.id));
    } else {
      const colorIndex = (existing.length + i) % COLOR_PALETTE.length;
      await db.insert(categories).values({
        key,
        label,
        color: COLOR_PALETTE[colorIndex],
        sortOrder: i,
      });
    }
  }

  revalidatePath("/settings");
  revalidatePath("/tasks");
}
