import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
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
  completedAt: text("completed_at"),
  recurringTaskId: integer("recurring_task_id").references(() => recurringTasks.id),
  dismissedFromFocus: text("dismissed_from_focus"),
  notes: text("notes"),
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
  timeframe: text("timeframe", {
    enum: ["90_day", "180_day"],
  }).notNull().default("90_day"),
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

export const recurringTasks = sqliteTable("recurring_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  client: text("client"),
  estimatedHours: real("estimated_hours"),
  frequency: text("frequency", {
    enum: ["weekly", "fortnightly", "monthly"],
  }).notNull().default("weekly"),
  dayOfWeek: integer("day_of_week").default(1), // 1=Monday
  dayOfMonth: integer("day_of_month"), // 1-31, used for monthly tasks
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastGeneratedAt: text("last_generated_at"),
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

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const weeklyPriorities = sqliteTable("weekly_priorities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weekStart: text("week_start").notNull().unique(), // ISO date string for Monday of the week
  priorities: text("priorities").notNull(), // free-text, user's own words
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const businessContext = sqliteTable("business_context", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessDescription: text("business_description"),
  toolsUsed: text("tools_used"),
  teamSize: text("team_size"),
  revenueModel: text("revenue_model"),
  startDate: text("start_date"),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const categoryTargets = sqliteTable("category_targets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category")
    .notNull()
    .unique(),
  targetPercentage: integer("target_percentage").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
