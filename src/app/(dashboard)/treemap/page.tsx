import { getAllTasks } from "@/server/queries/tasks";
import { LeverageTreemap } from "./components/leverage-treemap";

export default async function TreemapPage() {
  const tasks = await getAllTasks();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leverage Treemap</h1>
        <p className="text-sm text-muted-foreground">
          Area = leverage score. Color = category.
        </p>
      </div>
      <LeverageTreemap tasks={tasks} />
    </div>
  );
}
