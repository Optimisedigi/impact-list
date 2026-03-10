import { NextResponse } from "next/server";
import { getAllClients } from "@/server/actions/clients";
import { chatCompletion, isAIConfigured } from "@/lib/ai-provider";

export async function POST(request: Request) {
  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "AI provider not configured. See .env.example for setup." },
      { status: 500 }
    );
  }

  const { text } = await request.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const clients = await getAllClients();
  const clientNames = clients.map((c) => c.name);

  const prompt = `Extract task details from this voice input. Use Australian English in all text output (e.g. prioritise, organise, analyse). Return ONLY valid JSON.

Voice input: "${text}"

${clientNames.length > 0 ? `Known clients: ${clientNames.join(", ")}` : ""}

Return JSON with these fields (use null for anything not mentioned):
{
  "title": "Clear, concise task title",
  "category": "client_delivery" | "systems_automation" | "client_growth" | "team_management" | "admin",
  "client": "client name or null",
  "deadline": "YYYY-MM-DD or null",
  "estimatedHours": number or null,
  "status": "not_started" | "in_progress",
  "toComplete": "today" | "next_2_days" | "this_week" | null
}

Category guide:
- client_delivery: Work done for/with specific clients
- systems_automation: Building tools, automating processes
- client_growth: Sales, marketing, lead generation, business development
- team_management: Hiring, training, team coordination
- admin: Invoicing, bookkeeping, emails, general admin

Today's date is ${new Date().toISOString().split("T")[0]}. If they say "next Friday", "end of month", etc., calculate the actual date.`;

  try {
    const responseText = await chatCompletion(prompt, 256);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse response" }, { status: 500 });
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI request failed" },
      { status: 500 }
    );
  }
}
