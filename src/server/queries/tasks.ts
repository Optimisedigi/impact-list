import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, like, and, desc, asc, inArray, ne, isNotNull, type SQL, type AnyColumn } from "drizzle-orm";

export async function getAllTasks() {
  return db.select().from(tasks).orderBy(asc(tasks.sortOrder), desc(tasks.leverageScore));
}

export async function getTaskById(id: number) {
  const result = await db.select().from(tasks).where(eq(tasks.id, id));
  return result[0] ?? null;
}

// Whitelist of columns the table UI is allowed to sort by. Keeps the URL
// from being able to inject arbitrary column references into the SQL builder.
const SORTABLE_COLUMNS = {
  title: tasks.title,
  category: tasks.category,
  status: tasks.status,
  toComplete: tasks.toComplete,
  client: tasks.client,
  deadline: tasks.deadline,
  estimatedHours: tasks.estimatedHours,
  actualHours: tasks.actualHours,
  leverageScore: tasks.leverageScore,
  priorityScore: tasks.priorityScore,
} as const satisfies Record<string, AnyColumn>;

export type SortableColumn = keyof typeof SORTABLE_COLUMNS;
export type SortOrder = "asc" | "desc";

export async function getTasksByFilter(filters: {
  status?: string;
  category?: string;
  client?: string;
  search?: string;
  sort?: string;
  order?: string;
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

  // Resolve sort: must be a whitelisted column, and order must be asc/desc.
  // Anything invalid (or absent) falls back to the page default.
  const sortColumn = filters.sort && filters.sort in SORTABLE_COLUMNS
    ? SORTABLE_COLUMNS[filters.sort as SortableColumn]
    : null;
  const orderDir: SortOrder = filters.order === "asc" ? "asc" : "desc";

  if (sortColumn) {
    // Primary: user-chosen column. Tiebreaker: most recent sortOrder, then id
    // for a stable order when values are equal (e.g. NULL deadlines).
    return query.orderBy(
      orderDir === "asc" ? asc(sortColumn) : desc(sortColumn),
      desc(tasks.sortOrder),
      desc(tasks.id)
    );
  }

  // Newest first: higher sortOrder = more recently created (see createTask in server/actions/tasks.ts)
  return query.orderBy(desc(tasks.sortOrder), desc(tasks.leverageScore));
}

export async function getScoredTaskSummaries() {
  return db
    .select({ status: tasks.status, leverageScore: tasks.leverageScore })
    .from(tasks)
    .where(isNotNull(tasks.leverageScore));
}

export async function getDistinctClients() {
  const result = await db
    .selectDistinct({ client: tasks.client })
    .from(tasks);
  return result.map((r) => r.client).filter(Boolean) as string[];
}
