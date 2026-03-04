import { getTasksByFilter, getDistinctClients } from "@/server/queries/tasks";
import { getAllClients } from "@/server/actions/clients";
import { getAllCategories } from "@/server/actions/categories";
import { generateRecurringTasks } from "@/server/actions/recurring-tasks";
import { buildCategoryMap, buildCategoryOptions } from "@/lib/constants";
import { TaskTable } from "./components/task-table";
import { TaskFilters } from "./components/task-filters";
import { TaskForm } from "./components/task-form";
import { ScoreButton } from "@/components/ui/score-button";
import { HowItWorksDialog } from "./components/how-it-works-dialog";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; client?: string; search?: string; highlight?: string }>;
}) {
  const params = await searchParams;
  // Auto-generate any due recurring tasks before fetching (skip revalidate since we're already rendering)
  await generateRecurringTasks({ skipRevalidate: true });
  const [tasks, clients, managedClients, dbCategories] = await Promise.all([
    getTasksByFilter(params),
    getDistinctClients(),
    getAllClients(),
    getAllCategories(),
  ]);
  const clientNames = managedClients.length > 0
    ? managedClients.map((c) => c.name)
    : clients;
  const categoryMap = buildCategoryMap(dbCategories);
  const categoryOptions = buildCategoryOptions(dbCategories);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden">
      <div className="shrink-0 space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-sm text-muted-foreground">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HowItWorksDialog />
            <ScoreButton />
            <TaskForm clientOptions={clientNames} categoryOptions={categoryOptions} />
          </div>
        </div>
        <TaskFilters clients={clientNames} categoryOptions={categoryOptions} initialFilters={params} />
      </div>
      <div className="min-h-0 flex-1 flex flex-col">
        <TaskTable tasks={tasks} clientOptions={clientNames} categoryMap={categoryMap} categoryOptions={categoryOptions} highlightId={params.highlight ? Number(params.highlight) : undefined} />
      </div>
    </div>
  );
}
