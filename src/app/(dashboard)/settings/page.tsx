import { db } from "@/db";
import { categoryTargets } from "@/db/schema";
import { getAllPhases } from "@/server/queries/growth-phases";
import { getAllClients } from "@/server/actions/clients";
import { getAllRecurringTasks } from "@/server/actions/recurring-tasks";
import { CategoryTargetsForm } from "./components/category-targets-form";
import { GrowthPhasesManager } from "./components/growth-phases-manager";
import { ClientManager } from "./components/client-manager";
import { RecurringTasksManager } from "./components/recurring-tasks-manager";
import { CategoryManager } from "./components/category-manager";
import { CsvImportDialog } from "../tasks/components/csv-import-dialog";
import { getAllCategories } from "@/server/actions/categories";
import { getBusinessContext } from "@/server/actions/business-context";
import { BusinessContextForm } from "./components/business-context-form";
import { buildCategoryOptions } from "@/lib/constants";

export default async function SettingsPage() {
  const [targets, phases, clients, recurring, dbCategories, bizContext] = await Promise.all([
    db.select().from(categoryTargets),
    getAllPhases(),
    getAllClients(),
    getAllRecurringTasks(),
    getAllCategories(),
    getBusinessContext(),
  ]);
  const clientNames = clients.map((c) => c.name);
  const categoryLabels = dbCategories.map((c) => c.label);
  const categoryOptions = buildCategoryOptions(dbCategories);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure growth phases and time allocation targets.</p>
      </div>
      <div className="flex items-center gap-2">
        <CsvImportDialog />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BusinessContextForm initial={bizContext} />
        <GrowthPhasesManager phases={phases} />
        <CategoryTargetsForm targets={targets} categoryOptions={categoryOptions} />
        <RecurringTasksManager tasks={recurring} clientOptions={clientNames} categoryOptions={categoryOptions} />
        <CategoryManager categories={categoryLabels} />
        <ClientManager clients={clientNames} />
      </div>

      <div className="rounded-lg bg-gray-900 p-5 text-sm text-gray-100 dark:bg-gray-950 dark:border dark:border-gray-800">
        <p className="font-semibold text-white text-base mb-3">How AI Scoring Works</p>
        <p className="text-gray-300 mb-2">
          When you press &quot;Score with AI&quot; on the Tasks page, the AI reads six things to prioritise your tasks:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-gray-300">
          <li><strong className="text-white">Business Context</strong> &ndash; What your business does, the tools you use, team size, and revenue model. This tells the AI what &quot;high leverage&quot; means for <em>your</em> situation.</li>
          <li><strong className="text-white">Active Growth Phase</strong> &ndash; Your 90-day goal (primary) and 180-day goal (secondary). The AI judges how much each task unlocks progress toward these.</li>
          <li><strong className="text-white">Weekly Priorities</strong> &ndash; What you wrote as this week&apos;s focus. Matching tasks get a priority boost.</li>
          <li><strong className="text-white">Category Targets</strong> &ndash; Your ideal time split. The AI factors in whether you are over or under-investing in a category.</li>
          <li><strong className="text-white">Your Tasks</strong> &ndash; Title, category, status, client, deadline, and hours for every active task.</li>
        </ol>
        <p className="text-gray-300 mt-3">
          Only <strong className="text-white">one growth phase is active</strong> at a time. When your priorities shift, edit the active phase or activate a different one.
        </p>
        <p className="font-semibold text-white mt-4 mb-1">Getting the best scores</p>
        <ol className="list-decimal list-inside space-y-1 text-gray-300 text-xs">
          <li>Fill in <strong className="text-white">Business Context</strong> above so the AI understands your world</li>
          <li>Set an <strong className="text-white">active 90-day goal</strong> with specific focus areas</li>
          <li>Write specific task titles that include the <strong className="text-white">outcome</strong>, not just the activity</li>
          <li>Add <strong className="text-white">deadlines</strong> and <strong className="text-white">estimated hours</strong> for better urgency and effort judgement</li>
          <li>Update <strong className="text-white">weekly priorities</strong> each week on the Focus page</li>
        </ol>
        <div className="mt-3 space-y-1.5">
          <p className="text-gray-400 text-xs font-medium">Example task titles:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-300 text-xs">
            <li><strong className="text-red-400">Bad:</strong> &quot;Website work&quot; &ndash; vague, AI cannot judge impact</li>
            <li><strong className="text-green-400">Good:</strong> &quot;Build landing page for lead magnet to capture emails&quot; &ndash; AI sees this unlocks growth</li>
            <li><strong className="text-red-400">Bad:</strong> &quot;Client call&quot; &ndash; no context</li>
            <li><strong className="text-green-400">Good:</strong> &quot;Onboarding call with Client X to align on Q2 deliverables&quot; &ndash; AI sees client delivery value</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
