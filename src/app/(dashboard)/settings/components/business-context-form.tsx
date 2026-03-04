"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveBusinessContext, type BusinessContextData } from "@/server/actions/business-context";
import { Building2, Check } from "lucide-react";

export function BusinessContextForm({ initial }: { initial: BusinessContextData | null }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<BusinessContextData>({
    businessDescription: initial?.businessDescription ?? "",
    toolsUsed: initial?.toolsUsed ?? "",
    teamSize: initial?.teamSize ?? "",
    revenueModel: initial?.revenueModel ?? "",
  });

  function handleSave() {
    startTransition(async () => {
      await saveBusinessContext(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          Business Context
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Give the AI context about your business so it can score tasks more accurately.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="bc-desc">What does your business do?</Label>
          <Textarea
            id="bc-desc"
            placeholder="e.g. We're a digital marketing agency serving local businesses. We build websites, run SEO campaigns, and manage Google Ads for 12 active clients."
            value={form.businessDescription}
            onChange={(e) => setForm({ ...form, businessDescription: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bc-tools">Tools and platforms you use</Label>
          <Textarea
            id="bc-tools"
            placeholder="e.g. Figma, Next.js, Vercel, Stripe, Google Analytics, Slack, Linear, Notion"
            value={form.toolsUsed}
            onChange={(e) => setForm({ ...form, toolsUsed: e.target.value })}
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            Helps the AI understand effort involved in tasks like &quot;migrate to X&quot; or &quot;set up Y integration&quot;.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bc-team">Team size</Label>
            <Input
              id="bc-team"
              placeholder="e.g. Solo, 3 people, 10+"
              value={form.teamSize}
              onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bc-revenue">Revenue model</Label>
            <Input
              id="bc-revenue"
              placeholder="e.g. Retainer clients, SaaS subscriptions"
              value={form.revenueModel}
              onChange={(e) => setForm({ ...form, revenueModel: e.target.value })}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isPending} size="sm">
          {saved ? (
            <>
              <Check className="mr-1 h-3 w-3" />
              Saved
            </>
          ) : isPending ? (
            "Saving..."
          ) : (
            "Save Context"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
