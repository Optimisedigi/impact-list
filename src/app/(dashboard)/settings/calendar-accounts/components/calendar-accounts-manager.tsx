"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearSubscriptionEvents,
  disconnectAccount,
  refreshAccountCalendars,
  toggleSubscriptionFlag,
} from "@/server/actions/calendar-accounts";
import { setSubscriptionProfile } from "@/server/actions/calendar-profiles";
import type { AccountWithSubscriptions } from "@/server/queries/calendar-accounts";
import type { ProfileWithColor } from "@/server/queries/calendar-profiles";
import { useRouter } from "next/navigation";

interface Props {
  accounts: AccountWithSubscriptions[];
  profiles: ProfileWithColor[];
}

// Locale formatting differs between server and client, so render the
// timestamp only after mount to avoid hydration mismatches.
function LastSyncedAt({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(new Date(iso).toLocaleString());
  }, [iso]);
  return (
    <p className="text-xs text-muted-foreground">
      Last synced {text ?? "…"}
    </p>
  );
}

export function CalendarAccountsManager({ accounts, profiles }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [appleForm, setAppleForm] = useState({
    username: "",
    password: "",
    label: "",
  });
  const [appleError, setAppleError] = useState<string | null>(null);

  function handleSyncNow() {
    startTransition(async () => {
      await fetch("/api/calendar/sync", { method: "POST" });
      router.refresh();
    });
  }

  function handleAppleConnect(e: React.FormEvent) {
    e.preventDefault();
    setAppleError(null);
    startTransition(async () => {
      const res = await fetch("/api/calendar/apple/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(appleForm),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Connection failed" }));
        setAppleError(j.error ?? "Connection failed");
        return;
      }
      setAppleForm({ username: "", password: "", label: "" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild>
          <a href="/api/calendar/google/auth">Connect Google Calendar</a>
        </Button>
        <Button
          variant="outline"
          onClick={handleSyncNow}
          disabled={isPending || accounts.length === 0}
        >
          Sync now
        </Button>
      </div>

      <form
        onSubmit={handleAppleConnect}
        className="space-y-2 rounded-md border border-border bg-card p-4"
      >
        <h3 className="font-semibold">Connect Apple Calendar (iCloud)</h3>
        <p className="text-xs text-muted-foreground">
          Generate an app-specific password at appleid.apple.com → Sign-In and
          Security → App-Specific Passwords.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="apple-user">Apple ID email</Label>
            <Input
              id="apple-user"
              value={appleForm.username}
              onChange={(e) =>
                setAppleForm({ ...appleForm, username: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="apple-pass">App-specific password</Label>
            <Input
              id="apple-pass"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={appleForm.password}
              onChange={(e) =>
                setAppleForm({ ...appleForm, password: e.target.value })
              }
              placeholder="xxxx-xxxx-xxxx-xxxx"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="apple-label">Label (optional)</Label>
            <Input
              id="apple-label"
              value={appleForm.label}
              onChange={(e) =>
                setAppleForm({ ...appleForm, label: e.target.value })
              }
            />
          </div>
        </div>
        {appleError && (
          <p className="text-xs text-destructive">{appleError}</p>
        )}
        <Button type="submit" disabled={isPending}>
          Connect Apple Calendar
        </Button>
      </form>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No accounts connected yet.
        </p>
      ) : (
        accounts.map(({ account, subscriptions }) => (
          <div
            key={account.id}
            className="space-y-2 rounded-md border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {account.label}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({account.provider})
                  </span>
                </p>
                {account.lastSyncedAt && (
                  <LastSyncedAt iso={account.lastSyncedAt} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    startTransition(async () => {
                      await refreshAccountCalendars(account.id);
                      router.refresh();
                    })
                  }
                  disabled={isPending}
                  title="Re-discover calendars (e.g. newly-shared ones)"
                >
                  Refresh calendars
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    // First confirm disconnect; second prompt asks about events.
                    if (
                      !window.confirm(
                        `Disconnect "${account.label}"?\n\nThis stops syncing. Your data inside Apple/Google is untouched.`,
                      )
                    )
                      return;
                    const alsoDelete = window.confirm(
                      `Also delete every event that came from "${account.label}"?\n\nOK = delete the local copies.\nCancel = keep the events visible in Impact List.`,
                    );
                    startTransition(async () => {
                      await disconnectAccount(account.id, {
                        deleteEvents: alsoDelete,
                      });
                      router.refresh();
                    });
                  }}
                  disabled={isPending}
                >
                  Disconnect
                </Button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-1 font-normal">Calendar</th>
                  <th className="pb-1 font-normal">Profile</th>
                  <th
                    className="pb-1 text-center font-normal"
                    title="Pull events from this calendar"
                  >
                    Sync
                  </th>
                  <th
                    className="pb-1 text-center font-normal"
                    title="Push local edits back to this calendar"
                  >
                    Write
                  </th>
                  <th
                    className="pb-1 text-center font-normal"
                    title="Show events from this calendar by default on the calendar view"
                  >
                    Show
                  </th>
                  <th className="pb-1 text-right font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-t border-border">
                    <td className="py-1.5">{sub.name}</td>
                    <td className="py-1.5">
                      <select
                        value={sub.profileId ?? ""}
                        onChange={(e) =>
                          startTransition(async () => {
                            const v = e.target.value;
                            await setSubscriptionProfile(
                              sub.id,
                              v === "" ? null : Number(v),
                            );
                            router.refresh();
                          })
                        }
                        className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="">— Unassigned —</option>
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={sub.syncEnabled}
                        onChange={(e) =>
                          startTransition(async () => {
                            await toggleSubscriptionFlag(
                              sub.id,
                              "syncEnabled",
                              e.target.checked,
                            );
                          })
                        }
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={sub.writeEnabled}
                        onChange={(e) =>
                          startTransition(async () => {
                            await toggleSubscriptionFlag(
                              sub.id,
                              "writeEnabled",
                              e.target.checked,
                            );
                          })
                        }
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={sub.visibleByDefault}
                        onChange={(e) =>
                          startTransition(async () => {
                            await toggleSubscriptionFlag(
                              sub.id,
                              "visibleByDefault",
                              e.target.checked,
                            );
                            router.refresh();
                          })
                        }
                      />
                    </td>
                    <td className="py-1.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Hide "${sub.name}" and delete its events?\n\nFuture syncs from this calendar are turned off. Your data inside Apple/Google is untouched.`,
                            )
                          )
                            return;
                          startTransition(async () => {
                            await clearSubscriptionEvents(sub.id);
                            router.refresh();
                          });
                        }}
                        disabled={isPending}
                        title="Wipe events from this calendar and stop syncing it"
                      >
                        Hide
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
