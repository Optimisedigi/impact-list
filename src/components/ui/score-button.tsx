"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function ScoreButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleScore() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/score", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Error: ${data.error}`);
      } else {
        setResult(`Scored ${data.updated} tasks`);
        // Reload to show updated scores
        window.location.reload();
      }
    } catch {
      setResult("Failed to connect to AI scoring API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleScore}
        disabled={loading}
      >
        <Sparkles className="mr-1 h-4 w-4" />
        {loading ? "Scoring..." : "AI Score"}
      </Button>
      {result && (
        <span className={`text-xs ${result.startsWith("Error") ? "text-destructive" : "text-green-400"}`}>
          {result}
        </span>
      )}
    </div>
  );
}
