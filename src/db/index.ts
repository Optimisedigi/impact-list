import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const syncUrl = process.env.TURSO_SYNC_URL;

const client = createClient(
  syncUrl
    ? {
        url: process.env.DATABASE_URL || "file:./local-replica.db",
        syncUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN,
        syncInterval: 60,
        offline: true,
      }
    : {
        url: process.env.DATABASE_URL || "file:./local.db",
        authToken: process.env.DATABASE_AUTH_TOKEN,
      }
);

export const db = drizzle(client, { schema });
