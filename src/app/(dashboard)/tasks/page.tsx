import { getTasksByFilter, getDistinctClients } from "@/server/queries/tasks";
import { getAllClients } from "@/server/actions/clients";
import { TaskTable } from "./components/task-table";
import { TaskFilters } from "./components/task-filters";
import { TaskForm } from "./components/task-form";
import { CsvImportDialog } from "./components/csv-import-dialog";
import { ScoreButton } from "@/components/ui/score-button";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; client?: string; search?: string }>;
}) {
  const params = await searchParams;
  const [tasks, clients, managedClients] = await Promise.all([
    getTasksByFilter(params),
    getDistinctClients(),
    getAllClients(),
  ]);
  const clientNames = managedClients.length > 0
    ? managedClients.map((c) => c.name)
    : clients;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScoreButton />
          <CsvImportDialog />
          <TaskForm clientOptions={clientNames} />
        </div>
      </div>
      <TaskFilters clients={clientNames} initialFilters={params} />
      <TaskTable tasks={tasks} clientOptions={clientNames} />
    </div>
  );
}
