"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarAccountsManager } from "../calendar-accounts/components/calendar-accounts-manager";
import { CalendarProfilesManager } from "../calendar-profiles/components/calendar-profiles-manager";
import type { AccountWithSubscriptions } from "@/server/queries/calendar-accounts";
import type { ProfileWithColor } from "@/server/queries/calendar-profiles";
import type { ResolvedColor } from "@/server/queries/calendar-color-labels";

interface Props {
  accounts: AccountWithSubscriptions[];
  profiles: ProfileWithColor[];
  resolvedColors: ResolvedColor[];
}

export function CalendarSettingsCard({
  accounts,
  profiles,
  resolvedColors,
}: Props) {
  return (
    <div className="rounded-lg border p-6 space-y-4 lg:col-span-2">
      <div>
        <h2 className="text-lg font-semibold">Calendar</h2>
        <p className="text-sm text-muted-foreground">
          Connect Google &amp; Apple calendars and group them into colored
          profiles (e.g. Work, Personal). Each calendar’s events render in its
          profile’s color.
        </p>
      </div>
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="mt-4">
          <CalendarAccountsManager accounts={accounts} profiles={profiles} />
        </TabsContent>
        <TabsContent value="profiles" className="mt-4">
          <CalendarProfilesManager
            profiles={profiles}
            resolvedColors={resolvedColors}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
