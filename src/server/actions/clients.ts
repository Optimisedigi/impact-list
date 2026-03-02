"use server";

import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAllClients() {
  return db.select().from(clients).orderBy(clients.name);
}

export async function saveClients(names: string[]) {
  const trimmed = names.map((n) => n.trim()).filter(Boolean);
  const existing = await db.select().from(clients);
  const existingNames = new Set(existing.map((c) => c.name));
  const newNames = new Set(trimmed);

  // Delete removed clients
  for (const client of existing) {
    if (!newNames.has(client.name)) {
      await db.delete(clients).where(eq(clients.id, client.id));
    }
  }

  // Add new clients
  for (const name of trimmed) {
    if (!existingNames.has(name)) {
      await db.insert(clients).values({ name });
    }
  }

  revalidatePath("/settings");
  revalidatePath("/tasks");
}
