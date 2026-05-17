import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.local" });

const client = createClient({
  url: process.env.DATABASE_URL,
  syncUrl: process.env.TURSO_SYNC_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
  offline: true,
});

await client.sync();
const r = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'calendar%'");
console.log("calendar tables:", r.rows.map(x => x.name));
