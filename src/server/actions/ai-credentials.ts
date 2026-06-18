"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiCredentials } from "@/db/schema";
import { KIMI_PROVIDER, type KimiCredential } from "@/lib/kimi-oauth";

function rowToCredential(row: typeof aiCredentials.$inferSelect): KimiCredential {
  return {
    kind: "oauth",
    provider: KIMI_PROVIDER,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    expiresAt: new Date(row.tokenExpiresAt).getTime(),
    clientId: row.clientId,
    scope: row.scope ?? "kimi-code",
    obtainedAt: new Date(row.createdAt).getTime(),
    deviceId: row.deviceId,
    kimiModelId: row.modelId ?? undefined,
    kimiModelDisplay: row.modelDisplay ?? undefined,
    kimiContextLength: row.contextLength ?? undefined,
  };
}

export async function getKimiCredential(): Promise<KimiCredential | null> {
  const rows = await db
    .select()
    .from(aiCredentials)
    .where(eq(aiCredentials.provider, KIMI_PROVIDER))
    .limit(1);
  return rows[0] ? rowToCredential(rows[0]) : null;
}

export async function upsertKimiCredential(credential: KimiCredential): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(aiCredentials)
    .values({
      provider: KIMI_PROVIDER,
      kind: "oauth",
      accessToken: credential.accessToken,
      refreshToken: credential.refreshToken,
      tokenExpiresAt: new Date(credential.expiresAt).toISOString(),
      clientId: credential.clientId,
      scope: credential.scope,
      deviceId: credential.deviceId,
      modelId: credential.kimiModelId ?? null,
      modelDisplay: credential.kimiModelDisplay ?? null,
      contextLength: credential.kimiContextLength ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aiCredentials.provider,
      set: {
        kind: "oauth",
        accessToken: credential.accessToken,
        refreshToken: credential.refreshToken,
        tokenExpiresAt: new Date(credential.expiresAt).toISOString(),
        clientId: credential.clientId,
        scope: credential.scope,
        deviceId: credential.deviceId,
        modelId: credential.kimiModelId ?? null,
        modelDisplay: credential.kimiModelDisplay ?? null,
        contextLength: credential.kimiContextLength ?? null,
        updatedAt: now,
      },
    });
}

export async function deleteKimiCredential(): Promise<void> {
  await db.delete(aiCredentials).where(eq(aiCredentials.provider, KIMI_PROVIDER));
}

export async function getKimiConnectionStatus(): Promise<{
  connected: boolean;
  expired: boolean;
  provider: typeof KIMI_PROVIDER;
  modelId?: string;
  modelDisplay?: string;
  contextLength?: number;
  tokenExpiresAt?: string;
  updatedAt?: string;
}> {
  const rows = await db
    .select()
    .from(aiCredentials)
    .where(eq(aiCredentials.provider, KIMI_PROVIDER))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return { connected: false, expired: false, provider: KIMI_PROVIDER };
  }
  return {
    connected: true,
    expired: new Date(row.tokenExpiresAt).getTime() <= Date.now(),
    provider: KIMI_PROVIDER,
    modelId: row.modelId ?? undefined,
    modelDisplay: row.modelDisplay ?? undefined,
    contextLength: row.contextLength ?? undefined,
    tokenExpiresAt: row.tokenExpiresAt,
    updatedAt: row.updatedAt,
  };
}
