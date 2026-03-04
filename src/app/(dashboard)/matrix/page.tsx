import { getAllTasks } from "@/server/queries/tasks";
import { MatrixChart } from "./components/matrix-chart";

export default async function MatrixPage() {
  const tasks = await getAllTasks();

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="shrink-0 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Priority Matrix</h1>
        <p className="text-sm text-muted-foreground">
          Impact vs Effort. Bigger bubble = higher leverage. Colour = category. Top-right = quick wins to prioritise.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <MatrixChart tasks={tasks} />
      </div>
    </div>
  );
}
