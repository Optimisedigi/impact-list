import { describe, expect, it, vi } from "vitest";
import { googleListEvents } from "../google-client";
import type { calendar_v3 } from "googleapis";

function makeCalendarApi(
  listImpl: (
    params: calendar_v3.Params$Resource$Events$List,
  ) => Promise<{ data: calendar_v3.Schema$Events }>,
): calendar_v3.Calendar {
  return {
    events: {
      list: vi.fn(listImpl),
    },
  } as unknown as calendar_v3.Calendar;
}

describe("googleListEvents", () => {
  it("paginates and returns the final nextSyncToken", async () => {
    const calls: calendar_v3.Params$Resource$Events$List[] = [];
    const api = makeCalendarApi(async (params) => {
      calls.push(params);
      if (!params.pageToken) {
        return {
          data: {
            items: [{ id: "a" }, { id: "b" }],
            nextPageToken: "p2",
          },
        };
      }
      return {
        data: {
          items: [{ id: "c" }],
          nextSyncToken: "sync-final",
        },
      };
    });

    const res = await googleListEvents(api, "cal1", {
      timeMin: "2026-01-01T00:00:00Z",
      timeMax: "2026-12-31T23:59:59Z",
    });
    expect(res.events.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(res.nextSyncToken).toBe("sync-final");
    expect(calls).toHaveLength(2);
    expect(calls[0]!.singleEvents).toBe(true);
  });

  it("re-throws a 410 with code property when syncToken is stale", async () => {
    const api = makeCalendarApi(async () => {
      const e: Error & { code?: number } = new Error("Gone");
      e.code = 410;
      throw e;
    });

    await expect(
      googleListEvents(api, "cal1", { syncToken: "stale" }),
    ).rejects.toMatchObject({ code: 410 });
  });
});
