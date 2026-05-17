import { getProfiles } from "@/server/queries/calendar-profiles";
import { getResolvedColors } from "@/server/queries/calendar-color-labels";
import { CalendarProfilesManager } from "./components/calendar-profiles-manager";

export const dynamic = "force-dynamic";

export default async function CalendarProfilesPage() {
  const [profiles, resolvedColors] = await Promise.all([
    getProfiles(),
    getResolvedColors(),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar profiles</h1>
        <p className="text-sm text-muted-foreground">
          A profile is a named color bucket (e.g. Work, Personal, Family). Each
          connected calendar can be assigned to a profile in{" "}
          <a href="/settings/calendar-accounts" className="underline">
            Calendar accounts
          </a>{" "}
          — all events from that calendar will render in the profile&apos;s
          color.
        </p>
      </div>
      <CalendarProfilesManager
        profiles={profiles}
        resolvedColors={resolvedColors}
      />
    </div>
  );
}
