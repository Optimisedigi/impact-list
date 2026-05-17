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
  businessName: text("business_name"),
  businessDescription: text("business_description"),
  toolsUsed: text("tools_used"),
  teamSize: text("team_size"),
  revenueModel: text("revenue_model"),
  startDate: text("start_date"),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const calendarEvents = sqliteTable("calendar_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
  color: text("color"),
  // For local (source = 'local') events the user can assign a profile directly.
  // For remote events this is ignored — the subscription's profile wins.
  profileId: integer("profile_id"),
  source: text("source", {
    enum: ["local", "google", "apple"],
  })
    .notNull()
    .default("local"),
  externalId: text("external_id"),
  externalCalendarId: text("external_calendar_id"),
  externalEtag: text("external_etag"),
  externalUpdatedAt: text("external_updated_at"),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const calendarAccounts = sqliteTable("calendar_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider", { enum: ["google", "apple"] }).notNull(),
  label: text("label").notNull(),
  // Google OAuth
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: text("token_expires_at"),
  // Apple CalDAV
  caldavUrl: text("caldav_url"),
  caldavUsername: text("caldav_username"),
  caldavPassword: text("caldav_password"),
  // Sync state
  syncToken: text("sync_token"),
  ctag: text("ctag"),
  lastSyncedAt: text("last_synced_at"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const calendarProfiles = sqliteTable("calendar_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // Palette key from EVENT_COLORS (e.g. "blue", "peach").
  colorKey: text("color_key").notNull(),
  // Built-in fallback profile (e.g. "Other") shown when no other assignment
  // applies. Exactly one is_default row at a time.
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  // Whether events with this profile are visible by default on /calendar.
  // Users can still toggle individual profiles via the filter chips.
  visibleByDefault: integer("visible_by_default", { mode: "boolean" })
    .notNull()
    .default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const calendarColorLabels = sqliteTable("calendar_color_labels", {
  // Palette key from EVENT_COLORS (e.g. "peach", "blue"). One row per key the
  // user has renamed; missing keys fall back to the palette default label.
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const calendarSubscriptions = sqliteTable("calendar_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => calendarAccounts.id, { onDelete: "cascade" }),
  externalCalendarId: text("external_calendar_id").notNull(),
  name: text("name").notNull(),
  color: text("color"),
  profileId: integer("profile_id").references(() => calendarProfiles.id, {
    onDelete: "set null",
  }),
  syncEnabled: integer("sync_enabled", { mode: "boolean" }).notNull().default(true),
  writeEnabled: integer("write_enabled", { mode: "boolean" }).notNull().default(true),
  // Whether events from this calendar are visible by default on /calendar.
  // Filtering still happens per profile (subscriptions inherit via their
  // assigned profile), but flipping this lets you hide one calendar inside
  // a profile that's otherwise shown.
  visibleByDefault: integer("sub_visible_by_default", { mode: "boolean" })
    .notNull()
    .default(true),
  syncToken: text("sync_token"),
  ctag: text("ctag"),
  // Google push channel state
  channelId: text("channel_id"),
  channelResourceId: text("channel_resource_id"),
  channelExpiresAt: text("channel_expires_at"),
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
