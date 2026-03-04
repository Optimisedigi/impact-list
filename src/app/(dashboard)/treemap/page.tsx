import { getAllTasks } from "@/server/queries/tasks";
import { LeverageTreemap } from "./components/leverage-treemap";

export default async function TreemapPage() {
  const tasks = await getAllTasks();

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="shrink-0 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Leverage Treemap</h1>
        <p className="text-sm text-muted-foreground">
          Each rectangle is a task. Bigger area = higher leverage score (more strategic value toward your 90-day goal). Colour = category. Brighter = closer deadline.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <LeverageTreemap tasks={tasks} />
      </div>
    </div>
  );
}
