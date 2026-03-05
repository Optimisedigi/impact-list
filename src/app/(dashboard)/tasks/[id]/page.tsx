import { notFound } from "next/navigation";
import { getTaskById } from "@/server/queries/tasks";
import { getTimeEntriesForTask } from "@/server/queries/time-entries";
import { getAllClients } from "@/server/actions/clients";
import { getAllCategories } from "@/server/actions/categories";
import { getDistinctClients } from "@/server/queries/tasks";
import { buildCategoryMap, buildCategoryOptions } from "@/lib/constants";
import { TaskDetailView } from "./components/task-detail-view";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taskId = Number(id);
  if (isNaN(taskId)) notFound();

  const task = await getTaskById(taskId);
  if (!task) notFound();

  const [timeEntries, managedClients, distinctClients, dbCategories] =
    await Promise.all([
      getTimeEntriesForTask(taskId),
      getAllClients(),
      getDistinctClients(),
      getAllCategories(),
    ]);

  const clientOptions =
    managedClients.length > 0
      ? managedClients.map((c) => c.name)
      : distinctClients;
  const categoryMap = buildCategoryMap(dbCategories);
  const categoryOptions = buildCategoryOptions(dbCategories);

  return (
    <TaskDetailView
      task={task}
      timeEntries={timeEntries}
      clientOptions={clientOptions}
      categoryMap={categoryMap}
      categoryOptions={categoryOptions}
    />
  );
}
