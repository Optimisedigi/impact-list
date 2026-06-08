/**
 * AI Provider abstraction.
 *
 * Supports three provider types:
 *   1. "minimax" - MiniMax OpenAI-compatible API (default when MINIMAX_API_KEY is set)
 *   2. "anthropic" - Anthropic Claude API
 *   3. "openai" - Any OpenAI-compatible API (works with options like Ollama, Groq, LM Studio)
 *
 * Configure via environment variables in .env.local or Vercel:
 *   MINIMAX_API_KEY=your-key         # Uses MiniMax by default, no other AI env needed
 *   AI_PROVIDER=minimax              # Optional: "minimax", "anthropic", or "openai"
 *   AI_MODEL=MiniMax-M3              # Optional model override
 *   AI_BASE_URL=http://localhost:11434/v1   # For custom OpenAI-compatible providers
 *   AI_API_KEY=your-key             # Generic API key fallback
 */

type Provider = "anthropic" | "minimax" | "openai";

interface AIConfig {
  provider: Provider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

function getConfig(): AIConfig {
  const provider = getProvider();

  if (provider === "anthropic") {
    return {
      provider,
      baseUrl: "https://api.anthropic.com",
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY || "",
      model: process.env.AI_MODEL || "claude-haiku-4-5-20251001",
    };
  }

  if (provider === "minimax") {
    return {
      provider,
      baseUrl: process.env.MINIMAX_BASE_URL || process.env.AI_BASE_URL || "https://api.minimax.io/v1",
      apiKey: process.env.MINIMAX_API_KEY || process.env.AI_API_KEY || "",
      model: process.env.AI_MODEL || "MiniMax-M3",
    };
  }

  return {
    provider: "openai",
    baseUrl: process.env.AI_BASE_URL || "http://localhost:11434/v1",
    apiKey: process.env.AI_API_KEY || "ollama",
    model: process.env.AI_MODEL || "llama3",
  };
}

function getProvider(): Provider {
  const provider = process.env.AI_PROVIDER;
  if (provider === "anthropic" || provider === "minimax" || provider === "openai") {
    return provider;
  }
  if (process.env.MINIMAX_API_KEY) {
    return "minimax";
  }
  return "anthropic";
}

export function isAIConfigured(): boolean {
  const config = getConfig();
  if (config.provider === "anthropic" || config.provider === "minimax") {
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
      ...(config.provider === "minimax" ? { thinking: { type: "disabled" } } : {}),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${getProviderName(config)} API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error(`No response from ${getProviderName(config)}`);
  return text;
}

function getProviderName(config: AIConfig): string {
  if (config.provider === "minimax") {
    return "MiniMax";
  }
  return "AI provider";
}
