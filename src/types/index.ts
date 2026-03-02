import type { tasks, growthPhases, timeEntries, categoryTargets, clients } from "@/db/schema";
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
