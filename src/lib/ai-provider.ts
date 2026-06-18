import {
  KIMI_CODING_API_BASE_URL,
  KIMI_CODING_MODEL_ID,
  kimiAuthHeaders,
  isKimiExpiringSoon,
  refreshKimiCredential,
  type KimiCredential,
} from "@/lib/kimi-oauth";
import { getKimiCredential, upsertKimiCredential } from "@/server/actions/ai-credentials";

type LegacyProvider = "anthropic" | "minimax" | "openai";
type Provider = "kimi-coding" | LegacyProvider;

interface LegacyAIConfig {
  provider: LegacyProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

function isLegacyProvider(provider: string | undefined): provider is LegacyProvider {
  return provider === "anthropic" || provider === "minimax" || provider === "openai";
}

function isProvider(provider: string | undefined): provider is Provider {
  return provider === "kimi-coding" || isLegacyProvider(provider);
}

function getLegacyConfig(provider: LegacyProvider): LegacyAIConfig {
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

async function getProvider(): Promise<Provider> {
  const provider = process.env.AI_PROVIDER;
  if (isProvider(provider)) return provider;
  if (await getKimiCredential()) return "kimi-coding";
  if (process.env.MINIMAX_API_KEY) return "minimax";
  return "kimi-coding";
}

export async function isAIConfigured(): Promise<boolean> {
  const provider = await getProvider();
  if (provider === "kimi-coding") {
    return Boolean(await getKimiCredential());
  }

  const config = getLegacyConfig(provider);
  if (config.provider === "anthropic" || config.provider === "minimax") {
    return !!config.apiKey && config.apiKey !== "your-key-here";
  }
  return !!config.baseUrl;
}

export async function chatCompletion(
  prompt: string,
  maxTokens: number
): Promise<string> {
  const provider = await getProvider();
  if (provider === "kimi-coding") {
    return callKimiCoding(prompt, maxTokens);
  }

  const config = getLegacyConfig(provider);
  if (config.provider === "anthropic") {
    return callAnthropic(config, prompt, maxTokens);
  }
  return callOpenAICompatible(config, prompt, maxTokens);
}

async function resolveKimiCredential(): Promise<KimiCredential> {
  const credential = await getKimiCredential();
  if (!credential) {
    throw new Error("Kimi OAuth is not connected. Connect Kimi in Settings.");
  }
  if (!isKimiExpiringSoon(credential)) return credential;
  const refreshed = await refreshKimiCredential(credential);
  await upsertKimiCredential(refreshed);
  return refreshed;
}

async function callKimiCoding(prompt: string, maxTokens: number): Promise<string> {
  const credential = await resolveKimiCredential();
  const response = await fetch(`${KIMI_CODING_API_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...kimiAuthHeaders(credential),
    },
    body: JSON.stringify({
      model: credential.kimiModelId ?? KIMI_CODING_MODEL_ID,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
      thinking: { type: "disabled" },
      prompt_cache_key: "impact-list",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Kimi API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response from Kimi");
  return text;
}

async function callAnthropic(
  config: LegacyAIConfig,
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
  config: LegacyAIConfig,
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

function getProviderName(config: LegacyAIConfig): string {
  if (config.provider === "minimax") {
    return "MiniMax";
  }
  return "AI provider";
}
