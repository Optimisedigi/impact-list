import type { tasks, growthPhases, timeEntries, categoryTargets, clients, recurringTasks, categories, weeklyPriorities } from "@/db/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;
export type GrowthPhase = InferSelectModel<typeof growthPhases>;
export type NewGrowthPhase = InferInsertModel<typeof growthPhases>;
export type TimeEntry = InferSelectModel<typeof timeEntries>;
export type NewTimeEntry = InferInsertModel<typeof timeEntries>;
export type CategoryTarget = InferSelectModel<typeof categoryTargets>;
export type NewCategoryTarget = InferInsertModel<typeof categoryTargets>;
export type Client = InferSelectModel<typeof clients>;
export type NewClient = InferInsertModel<typeof clients>;
export type RecurringTask = InferSelectModel<typeof recurringTasks>;
export type NewRecurringTask = InferInsertModel<typeof recurringTasks>;
export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;
export type WeeklyPriority = InferSelectModel<typeof weeklyPriorities>;
