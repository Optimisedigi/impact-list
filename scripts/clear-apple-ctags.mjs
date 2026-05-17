// Force-clears every Apple subscription's ctag so the next sync re-fetches
// every CalDAV object from iCloud. Use when:
//  - the recurrence-expansion logic changed and existing events need to be
//    re-parsed
//  - subscription metadata drift needs to be reconciled
// Connects directly to Turso (not the offline replica) so it works against
// production from anywhere.
import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.TURSO_SYNC_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
if (!url || !authToken) {
  console.error(
    "Set TURSO_SYNC_URL and DATABASE_AUTH_TOKEN in .env.local before running.",
  );
  process.exit(1);
}

const client = createClient({ url, authToken });

const before = await client.execute({
  sql: `SELECT COUNT(*) AS n FROM calendar_subscriptions
        WHERE account_id IN (SELECT id FROM calendar_accounts WHERE provider = 'apple')
        AND ctag IS NOT NULL`,
});
console.log(`Apple subscriptions with a ctag: ${before.rows[0].n}`);

const res = await client.execute({
  sql: `UPDATE calendar_subscriptions SET ctag = NULL
        WHERE account_id IN (SELECT id FROM calendar_accounts WHERE provider = 'apple')`,
});
console.log(`Cleared ctags on ${res.rowsAffected} subscriptions.`);
