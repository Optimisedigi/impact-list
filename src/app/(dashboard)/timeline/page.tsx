import { getAllCategories } from "@/server/actions/categories";
import { getTimelineCandidateTasks, getTimelineTasks, type TimelineTask } from "@/server/queries/timeline";
import { getMultitaskColumns, type MultitaskColumn } from "@/server/actions/multitask-columns";
import { buildCategoryMap } from "@/lib/constants";
import { TimelineViewSwitcher } from "./components/timeline-view-switcher";
import type { Category } from "@/types";

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

export default async function TimelinePage() {
  const [tasksResult, allTasksResult, categoriesResult, multitaskResult] = await Promise.allSettled([
    getTimelineTasks(),
    getTimelineCandidateTasks(),
    getAllCategories(),
    getMultitaskColumns(),
  ]);
  const tasks = settledValue(tasksResult, [] as TimelineTask[]);
  const allTasks = settledValue(allTasksResult, [] as TimelineTask[]);
  const dbCategories = settledValue(categoriesResult, [] as Category[]);
  const multitaskColumns = settledValue(multitaskResult, [] as MultitaskColumn[]);
  const categoryMap = buildCategoryMap(dbCategories);
  const clients = Array.from(
    new Set(tasks.map((task) => task.client).filter((client): client is string => Boolean(client)))
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden">
      <TimelineViewSwitcher
        tasks={tasks}
        allTasks={allTasks}
        categoryMap={categoryMap}
        clients={clients}
        initialMultitaskColumns={multitaskColumns}
      />
    </div>
  );
}
