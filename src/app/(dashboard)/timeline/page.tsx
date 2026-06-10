import { getAllCategories } from "@/server/actions/categories";
import { getTimelineCandidateTasks, getTimelineTasks } from "@/server/queries/timeline";
import { buildCategoryMap } from "@/lib/constants";
import { TimelineChart } from "./components/timeline-chart";
import type { Category, Task } from "@/types";

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

export default async function TimelinePage() {
  const [tasksResult, allTasksResult, categoriesResult] = await Promise.allSettled([
    getTimelineTasks(),
    getTimelineCandidateTasks(),
    getAllCategories(),
  ]);
  const tasks = settledValue(tasksResult, [] as Task[]);
  const allTasks = settledValue(allTasksResult, [] as Task[]);
  const dbCategories = settledValue(categoriesResult, [] as Category[]);
  const categoryMap = buildCategoryMap(dbCategories);
  const clients = Array.from(
    new Set(tasks.map((task) => task.client).filter((client): client is string => Boolean(client)))
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden">
      <div className="shrink-0 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
        <p className="text-sm text-muted-foreground">
          Plan major projects across weekly columns, with a today marker and a few weeks of recent context.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <TimelineChart tasks={tasks} allTasks={allTasks} categoryMap={categoryMap} clients={clients} />
      </div>
    </div>
  );
}
