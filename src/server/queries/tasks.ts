import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, like, and, desc, asc, inArray, ne, type SQL } from "drizzle-orm";

export async function getAllTasks() {
  return db.select().from(tasks).orderBy(asc(tasks.sortOrder), desc(tasks.leverageScore));
}

export async function getTaskById(id: number) {
  const result = await db.select().from(tasks).where(eq(tasks.id, id));
  return result[0] ?? null;
}

export async function getTasksByFilter(filters: {
  status?: string;
  category?: string;
  client?: string;
  search?: string;
}) {
  const conditions: SQL[] = [];

  if (filters.status) {
    const statuses = filters.status.split(",");
    if (statuses.length === 1) {
      conditions.push(eq(tasks.status, statuses[0] as typeof tasks.status.enumValues[number]));
    } else {
      conditions.push(inArray(tasks.status, statuses as typeof tasks.status.enumValues[number][]));
    }
  } else {
    // Default: exclude "done" tasks
    conditions.push(ne(tasks.status, "done"));
  }
  if (filters.category) {
    conditions.push(eq(tasks.category, filters.category as typeof tasks.category.enumValues[number]));
  }
  if (filters.client) {
    conditions.push(eq(tasks.client, filters.client));
  }
  if (filters.search) {
    conditions.push(like(tasks.title, `%${filters.search}%`));
  }

  const query = conditions.length > 0
    ? db.select().from(tasks).where(and(...conditions))
    : db.select().from(tasks);

  return query.orderBy(asc(tasks.sortOrder), desc(tasks.leverageScore));
}

export async function getDistinctClients() {
  const result = await db
    .selectDistinct({ client: tasks.client })
    .from(tasks);
  return result.map((r) => r.client).filter(Boolean) as string[];
}
