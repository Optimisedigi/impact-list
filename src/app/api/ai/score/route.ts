import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAllTasks } from "@/server/queries/tasks";
import { getActivePhase } from "@/server/queries/growth-phases";
import { getCurrentTargets } from "@/server/actions/category-targets";

export async function POST() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured in .env.local" },
      { status: 500 }
    );
  }

  const [allTasks, phase, targets] = await Promise.all([
    getAllTasks(),
    getActivePhase(),
    getCurrentTargets(),
  ]);

  const activeTasks = allTasks.filter((t) => t.status !== "done");
  if (activeTasks.length === 0) {
    return NextResponse.json({ error: "No active tasks to score" }, { status: 400 });
  }

  const prompt = `You are a strategic task prioritization AI. Analyze these tasks and score each one.

## Active Growth Phase
${phase ? `**${phase.name}**: ${phase.description}\nFocus areas: ${phase.focusAreas}` : "No active growth phase set."}

## Category Time Targets
${targets.map((t) => `- ${t.category}: ${t.targetPercentage}%`).join("\n")}

## Tasks to Score
${JSON.stringify(
  activeTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    status: t.status,
    toComplete: t.toComplete,
    client: t.client,
    deadline: t.deadline,
    estimatedHours: t.estimatedHours,
    actualHours: t.actualHours,
  })),
  null,
  2
)}

## Scoring Instructions
For each task, provide:
1. **priorityScore** (1-10): How urgently this should be done, considering deadlines, dependencies, and current status
2. **leverageScore** (1-10): How much completing this task unlocks for the current growth phase. High leverage = completing it enables multiple other valuable outcomes. Consider: Does it build infrastructure? Does it generate recurring value? Does it align with the current phase's focus areas?
3. **sequenceReason**: A brief (1-2 sentence) explanation of why this task has this leverage score and where it fits in the optimal sequence

Return ONLY valid JSON in this format:
{"scores": [{"taskId": 1, "priorityScore": 8, "leverageScore": 9, "sequenceReason": "Explanation here"}, ...]}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json(
      { error: `Claude API error: ${response.status} - ${err}` },
      { status: 500 }
    );
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;

  if (!text) {
    return NextResponse.json({ error: "No response from Claude" }, { status: 500 });
  }

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Could not parse Claude response as JSON" }, { status: 500 });
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const scores = parsed.scores;

  if (!Array.isArray(scores)) {
    return NextResponse.json({ error: "Invalid scores format" }, { status: 500 });
  }

  // Update all tasks
  let updated = 0;
  for (const score of scores) {
    await db
      .update(tasks)
      .set({
        priorityScore: score.priorityScore,
        leverageScore: score.leverageScore,
        sequenceReason: score.sequenceReason,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, score.taskId));
    updated++;
  }

  return NextResponse.json({ success: true, updated });
}
