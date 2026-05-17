import { getAccountsWithSubscriptions } from "@/server/queries/calendar-accounts";
import { getProfiles } from "@/server/queries/calendar-profiles";
import { CalendarAccountsManager } from "./components/calendar-accounts-manager";

export const dynamic = "force-dynamic";

export default async function CalendarAccountsPage() {
  const [accounts, profiles] = await Promise.all([
    getAccountsWithSubscriptions(),
    getProfiles(),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar accounts</h1>
        <p className="text-sm text-muted-foreground">
          Connect Google Calendar or Apple Calendar (iCloud) to sync events
          two-way. Assign each calendar to a{" "}
          <a href="/settings/calendar-profiles" className="underline">
            profile
          </a>{" "}
          so all its events share the same color.
        </p>
      </div>
      <CalendarAccountsManager accounts={accounts} profiles={profiles} />
    </div>
  );
}
