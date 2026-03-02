import { db } from "@/db";
import { categoryTargets } from "@/db/schema";
import { getAllPhases } from "@/server/queries/growth-phases";
import { getAllClients } from "@/server/actions/clients";
import { CategoryTargetsForm } from "./components/category-targets-form";
import { GrowthPhasesManager } from "./components/growth-phases-manager";
import { ClientManager } from "./components/client-manager";

export default async function SettingsPage() {
  const [targets, phases, clients] = await Promise.all([
    db.select().from(categoryTargets),
    getAllPhases(),
    getAllClients(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure growth phases and time allocation targets.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryTargetsForm targets={targets} />
        <GrowthPhasesManager phases={phases} />
        <ClientManager clients={clients.map((c) => c.name)} />
      </div>
    </div>
  );
}
