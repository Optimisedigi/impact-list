"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";

export function HowItWorksDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="mr-1 h-4 w-4" />
          How it works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-gray-900 text-gray-100 border-gray-800 [&>button]:text-gray-400">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">Writing Tasks for Better AI Scoring</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-gray-300">
            When you press &quot;Score with AI&quot;, the AI scores every active task using <strong className="text-white">six inputs</strong> from your Settings page:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-gray-400 text-xs">
            <li><strong className="text-gray-200">Business Context</strong> &mdash; what your business does, your tools, team size, and revenue model</li>
            <li><strong className="text-gray-200">90-Day Goal</strong> &mdash; the primary driver of leverage scores</li>
            <li><strong className="text-gray-200">180-Day Goal</strong> &mdash; secondary directional context</li>
            <li><strong className="text-gray-200">Weekly Priorities</strong> &mdash; boosts priority for tasks matching this week&apos;s focus</li>
            <li><strong className="text-gray-200">Category Targets</strong> &mdash; your ideal time split across categories</li>
            <li><strong className="text-gray-200">Task details</strong> &mdash; title, category, status, client, deadline, and estimated hours</li>
          </ol>
          <p className="text-gray-300">
            The more you fill in, the better the scores. Start with <strong className="text-white">Business Context</strong> and a <strong className="text-white">90-Day Goal</strong> in Settings, then write specific task titles.
          </p>

          <div className="space-y-2">
            <div className="rounded-md bg-gray-800 p-3">
              <p className="text-red-400 font-medium text-xs mb-1">Bad</p>
              <p className="text-gray-300">&quot;Website work&quot;</p>
              <p className="text-gray-500 text-xs mt-0.5">Vague. AI cannot judge impact.</p>
            </div>
            <div className="rounded-md bg-gray-800 p-3">
              <p className="text-green-400 font-medium text-xs mb-1">Good</p>
              <p className="text-gray-300">&quot;Build landing page for lead magnet to capture emails&quot;</p>
              <p className="text-gray-500 text-xs mt-0.5">AI sees this unlocks growth and scores it higher.</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="rounded-md bg-gray-800 p-3">
              <p className="text-red-400 font-medium text-xs mb-1">Bad</p>
              <p className="text-gray-300">&quot;Client call&quot;</p>
              <p className="text-gray-500 text-xs mt-0.5">No context about purpose or value.</p>
            </div>
            <div className="rounded-md bg-gray-800 p-3">
              <p className="text-green-400 font-medium text-xs mb-1">Good</p>
              <p className="text-gray-300">&quot;Onboarding call with Client X to align on Q2 deliverables&quot;</p>
              <p className="text-gray-500 text-xs mt-0.5">AI sees client delivery value and strategic alignment.</p>
            </div>
          </div>

          <div className="rounded-md border border-gray-700 p-3 space-y-1.5">
            <p className="font-medium text-white text-xs">Tips for higher leverage scores:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400 text-xs">
              <li>Include the <strong className="text-gray-200">outcome</strong>, not just the activity</li>
              <li>Pick the right <strong className="text-gray-200">category</strong> so time allocation is accurate</li>
              <li>Add <strong className="text-gray-200">deadlines</strong> so the AI can factor in urgency</li>
              <li>Set <strong className="text-gray-200">estimated hours</strong> so effort vs. impact is considered</li>
              <li>Your <strong className="text-gray-200">active growth phase</strong> in Settings determines what the AI values most</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
