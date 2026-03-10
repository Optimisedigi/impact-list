/**
 * AI Provider abstraction.
 *
 * Supports two provider types:
 *   1. "anthropic" - Anthropic Claude API (paid, default)
 *   2. "openai" - Any OpenAI-compatible API (works with free options like Ollama, Groq, LM Studio)
 *
 * Configure via environment variables in .env.local:
 *   AI_PROVIDER=openai              # "anthropic" (default) or "openai"
 *   AI_BASE_URL=http://localhost:11434/v1   # For Ollama, or https://api.groq.com/openai/v1 for Groq
 *   AI_API_KEY=your-key             # API key (not needed for Ollama)
 *   AI_MODEL=llama3                 # Model name for your provider
 */

type Provider = "anthropic" | "openai";

interface AIConfig {
  provider: Provider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

function getConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER as Provider) || "anthropic";

  if (provider === "anthropic") {
    return {
      provider,
      baseUrl: "https://api.anthropic.com",
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY || "",
      model: process.env.AI_MODEL || "claude-haiku-4-5-20251001",
    };
  }

  return {
    provider: "openai",
    baseUrl: process.env.AI_BASE_URL || "http://localhost:11434/v1",
    apiKey: process.env.AI_API_KEY || "ollama",
    model: process.env.AI_MODEL || "llama3",
  };
}

export function isAIConfigured(): boolean {
  const config = getConfig();
  if (config.provider === "anthropic") {
    return !!config.apiKey && config.apiKey !== "your-key-here";
  }
  // OpenAI-compatible providers: assume configured if base URL is set
  return !!config.baseUrl;
}

export async function chatCompletion(
  prompt: string,
  maxTokens: number
): Promise<string> {
  const config = getConfig();

  if (config.provider === "anthropic") {
    return callAnthropic(config, prompt, maxTokens);
  }
  return callOpenAICompatible(config, prompt, maxTokens);
}

async function callAnthropic(
  config: AIConfig,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("No response from Anthropic");
  return text;
}

async function callOpenAICompatible(
  config: AIConfig,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey && config.apiKey !== "ollama"
        ? { Authorization: `Bearer ${config.apiKey}` }
        : {}),
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response from AI provider");
  return text;
}
