import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAllTasks } from "@/server/queries/tasks";
import { getActiveGoals } from "@/server/queries/growth-phases";
import { getCurrentTargets } from "@/server/actions/category-targets";
import { getWeeklyPriorities } from "@/server/actions/weekly-priorities";
import { getBusinessContext } from "@/server/actions/business-context";

export async function POST() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured in .env.local" },
      { status: 500 }
    );
  }

  const [allTasks, { goal90, goal180 }, targets, weekPriorities, bizContext] = await Promise.all([
    getAllTasks(),
    getActiveGoals(),
    getCurrentTargets(),
    getWeeklyPriorities(),
    getBusinessContext(),
  ]);

  const activeTasks = allTasks.filter((t) => t.status !== "done");
  if (activeTasks.length === 0) {
    return NextResponse.json({ error: "No active tasks to score" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  const hasBizContext = bizContext && (bizContext.businessDescription || bizContext.toolsUsed || bizContext.teamSize || bizContext.revenueModel);

  const prompt = `You are a strategic task prioritisation AI. Write all responses in Australian English (e.g. prioritise, organise, analyse, colour, favour, centre). Analyse these tasks and score each one.

Today's date: ${today}
${hasBizContext ? `
## Business Context
${bizContext!.businessDescription ? `**What the business does:** ${bizContext!.businessDescription}` : ""}
${bizContext!.toolsUsed ? `**Tools & platforms used:** ${bizContext!.toolsUsed}` : ""}
${bizContext!.teamSize ? `**Team size:** ${bizContext!.teamSize}` : ""}
${bizContext!.revenueModel ? `**Revenue model:** ${bizContext!.revenueModel}` : ""}

Use this context to understand the relative effort and strategic value of tasks. For example, tasks involving tools the business already uses are lower effort than adopting new tools. A solo operator automating repetitive work has different leverage than a 10-person team delegating it.
` : ""}
## 90-Day Goal (PRIMARY - this is the main driver of prioritisation)
${goal90 ? `**${goal90.name}**: ${goal90.description}\nFocus areas: ${goal90.focusAreas}` : "No 90-day goal set."}

## 180-Day Goal (SECONDARY - provides directional context)
${goal180 ? `**${goal180.name}**: ${goal180.description}\nFocus areas: ${goal180.focusAreas}` : "No 180-day goal set."}

## This Week's Priorities (USER-SET - treat as strong priority signals for this week)
${weekPriorities ? weekPriorities.priorities : "No weekly priorities set."}

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

### priorityScore (1-10): How urgently this should be done
The \`toComplete\` field, \`deadline\`, and **This Week's Priorities** are the user's explicit urgency signals. Tasks that match what the user wrote in their weekly priorities should get a significant priority boost (+2-3 points). Weight these signals heavily:
- \`toComplete: "today"\` or deadline = today/overdue → score 9-10
- \`toComplete: "this_week"\` or deadline within 7 days → score 7-9
- \`toComplete: "this_fortnight"\` or deadline within 14 days → score 5-7
- \`toComplete: "this_month"\` or deadline within 30 days → score 4-6
- \`toComplete: "this_quarter"\` or deadline beyond 30 days → score 2-4
- No toComplete and no deadline → score based on strategic importance (1-5)
- Tasks already \`in_progress\` get a +1 bump (momentum matters)

### leverageScore (1-10): How much this unlocks for the 90-day goal
This is the strategic score. Judge primarily against the **90-day goal**:
- Score 8-10: Directly drives a key outcome of the 90-day goal. Completing it unblocks multiple other tasks or creates compounding value.
- Score 5-7: Supports the 90-day goal indirectly, or directly supports the 180-day goal.
- Score 3-4: Necessary operational/maintenance work that keeps things running but doesn't advance goals.
- Score 1-2: Low strategic value relative to current goals. May be a "side quest."

**IMPORTANT for client delivery tasks:** This is an agency business. Client delivery is NOT just operational busywork. Delivering strong results for clients directly drives retention, referrals, and revenue, which are foundational to every business goal. Score client delivery tasks with this in mind:
- Client work that drives measurable performance improvements or hits key milestones → score 6-9 (high leverage because it secures ongoing revenue and builds case studies)
- Client work with tight deadlines or unhappy clients → score 7-9 (retention risk = business risk)
- Routine client maintenance with no strategic angle → score 3-5
- Never default client delivery to low leverage just because it's "operational". Ask: does this protect or grow revenue?

### sequenceReason
A brief (1-2 sentence) explanation of why this task has this leverage score and where it fits in the optimal sequence toward the 90-day goal.

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
        dismissedFromFocus: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, score.taskId));
    updated++;
  }

  return NextResponse.json({ success: true, updated });
}
