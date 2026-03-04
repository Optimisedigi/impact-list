import { NextResponse } from "next/server";
import { getAllClients } from "@/server/actions/clients";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
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
  const responseText = data.content?.[0]?.text;

  if (!responseText) {
    return NextResponse.json({ error: "No response from Claude" }, { status: 500 });
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Could not parse response" }, { status: 500 });
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return NextResponse.json(parsed);
}
