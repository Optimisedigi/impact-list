import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category", {
    enum: ["client_delivery", "systems_automation", "client_growth", "team_management", "admin"],
  }).notNull(),
  status: text("status", {
    enum: ["not_started", "in_progress", "done"],
  })
    .notNull()
    .default("not_started"),
  toComplete: text("to_complete"),
  client: text("client"),
  deadline: text("deadline"),
  estimatedHours: real("estimated_hours"),
  actualHours: real("actual_hours").default(0),
  priorityScore: integer("priority_score"),
  leverageScore: integer("leverage_score"),
  sequenceReason: text("sequence_reason"),
  growthPhaseId: integer("growth_phase_id").references(() => growthPhases.id),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const growthPhases = sqliteTable("growth_phases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  focusAreas: text("focus_areas"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const timeEntries = sqliteTable("time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  hours: real("hours").notNull(),
  date: text("date").notNull(),
  note: text("note"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const categoryTargets = sqliteTable("category_targets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category", {
    enum: ["client_delivery", "systems_automation", "client_growth", "team_management", "admin"],
  })
    .notNull()
    .unique(),
  targetPercentage: integer("target_percentage").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
