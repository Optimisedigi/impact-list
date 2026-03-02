import { getAllTasks } from "@/server/queries/tasks";
import { MatrixChart } from "./components/matrix-chart";

export default async function MatrixPage() {
  const tasks = await getAllTasks();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Priority Matrix</h1>
        <p className="text-sm text-muted-foreground">
          Impact vs Effort. Bubble size = leverage score. Color = category.
        </p>
      </div>
      <MatrixChart tasks={tasks} />
    </div>
  );
}
