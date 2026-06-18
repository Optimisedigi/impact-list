"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ConnectionStatus = {
  connected: boolean;
  expired: boolean;
  modelDisplay?: string;
  modelId?: string;
  tokenExpiresAt?: string;
};

type BeginResponse = {
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
  error?: string;
};

type PollStatus = "pending" | "slow_down" | "expired" | "denied" | "connected";

export function AiAuthCard({ status }: { status: ConnectionStatus }) {
  const [connection, setConnection] = useState(status);
  const [begin, setBegin] = useState<BeginResponse | null>(null);
  const [pollStatus, setPollStatus] = useState<PollStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  async function poll(intervalSeconds: number) {
    const response = await fetch("/api/ai/kimi/poll", { method: "POST" });
    const data = (await response.json()) as { status?: PollStatus; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Could not poll Kimi login");
    if (!data.status) throw new Error("Kimi login returned no status");

    setPollStatus(data.status);
    if (data.status === "connected") {
      setConnection({ connected: true, expired: false, modelDisplay: "Kimi For Coding", modelId: "kimi-for-coding" });
      setBegin(null);
      return;
    }
    if (data.status === "expired" || data.status === "denied") {
      setBegin(null);
      setError(data.status === "expired" ? "Kimi login expired. Start again." : "Kimi login was denied.");
      return;
    }

    const nextInterval = data.status === "slow_down" ? intervalSeconds + 5 : intervalSeconds;
    pollTimer.current = setTimeout(() => void poll(nextInterval).catch((err) => setError((err as Error).message)), nextInterval * 1000);
  }

  async function connect() {
    setLoading(true);
    setError(null);
    setPollStatus(null);
    if (pollTimer.current) clearTimeout(pollTimer.current);
    try {
      const response = await fetch("/api/ai/kimi/begin", { method: "POST" });
      const data = (await response.json()) as BeginResponse;
      if (!response.ok) throw new Error(data.error ?? "Could not start Kimi login");
      setBegin(data);
      pollTimer.current = setTimeout(() => void poll(data.interval).catch((err) => setError((err as Error).message)), data.interval * 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Kimi login");
    } finally {
      setLoading(false);
    }
  }

  const modelLabel = connection.modelDisplay ?? connection.modelId ?? "Kimi For Coding";

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Connection</CardTitle>
        <CardDescription>Connect Impact List to your Kimi coding subscription with OAuth.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-lg border p-3">
          <p className="font-medium">Kimi For Coding</p>
          <p className="text-muted-foreground">
            {connection.connected
              ? `${connection.expired ? "Expired" : "Connected"}${modelLabel ? ` · ${modelLabel}` : ""}`
              : "Not connected"}
          </p>
        </div>

        <Button type="button" onClick={connect} disabled={loading}>
          {loading ? "Starting..." : connection.connected ? "Reconnect Kimi" : "Connect Kimi"}
        </Button>

        {begin ? (
          <div className="space-y-2 rounded-lg bg-muted p-3">
            <p className="font-medium">Enter this code in Kimi:</p>
            <p className="font-mono text-2xl tracking-widest">{begin.userCode}</p>
            <a className="text-primary underline" href={begin.verificationUri} target="_blank" rel="noreferrer">
              Open Kimi verification page
            </a>
            <p className="text-muted-foreground">Waiting for approval{pollStatus ? ` (${pollStatus})` : ""}...</p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
