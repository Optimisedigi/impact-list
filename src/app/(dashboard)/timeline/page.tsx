import { getAllCategories } from "@/server/actions/categories";
import { getTimelineCandidateTasks, getTimelineTasks, type TimelineTask } from "@/server/queries/timeline";
import { buildCategoryMap } from "@/lib/constants";
import { TimelineViewSwitcher } from "./components/timeline-view-switcher";
import type { Category } from "@/types";

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

export default async function TimelinePage() {
  const [tasksResult, allTasksResult, categoriesResult] = await Promise.allSettled([
    getTimelineTasks(),
    getTimelineCandidateTasks(),
    getAllCategories(),
  ]);
  const tasks = settledValue(tasksResult, [] as TimelineTask[]);
  const allTasks = settledValue(allTasksResult, [] as TimelineTask[]);
  const dbCategories = settledValue(categoriesResult, [] as Category[]);
  const categoryMap = buildCategoryMap(dbCategories);
  const clients = Array.from(
    new Set(tasks.map((task) => task.client).filter((client): client is string => Boolean(client)))
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden">
      <TimelineViewSwitcher tasks={tasks} allTasks={allTasks} categoryMap={categoryMap} clients={clients} />
    </div>
  );
}
