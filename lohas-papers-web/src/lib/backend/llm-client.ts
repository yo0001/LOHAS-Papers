import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Types ──

export interface LLMConfig {
  provider: "anthropic" | "openai" | "google";
  apiKey: string;
  model: string;
}

// ── Constants ──

const LLM_MODEL = process.env.LLM_MODEL || "claude-sonnet-4-5-20250929";

// ── Singleton for server default Anthropic client ──

let _client: Anthropic | null = null;

function getDefaultAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new LLMServiceError(
        "AI service is not configured",
        "config_error",
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Custom error class for LLM service failures.
 * `code` helps the frontend display appropriate messages.
 */
export class LLMServiceError extends Error {
  code: "billing" | "rate_limit" | "overloaded" | "config_error" | "invalid_key" | "unknown";
  constructor(
    message: string,
    code: LLMServiceError["code"] = "unknown",
  ) {
    super(message);
    this.name = "LLMServiceError";
    this.code = code;
  }
}

// ── Provider-specific chat implementations ──

async function chatWithAnthropic(
  systemPrompt: string,
  userMessage: string,
  options: { expectJson?: boolean; maxTokens?: number },
  config?: LLMConfig,
): Promise<string> {
  const { expectJson = false, maxTokens = 2048 } = options;

  const client = config
    ? new Anthropic({ apiKey: config.apiKey })
    : getDefaultAnthropicClient();

  const model = config?.model || LLM_MODEL;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    let text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    if (expectJson) {
      text = stripCodeFences(text);
    }

    return text;
  } catch (err: unknown) {
    if (err instanceof Anthropic.APIError) {
      throw mapAnthropicError(err);
    }
    throw err;
  }
}

async function chatWithOpenAI(
  systemPrompt: string,
  userMessage: string,
  options: { expectJson?: boolean; maxTokens?: number },
  config: LLMConfig,
): Promise<string> {
  const { expectJson = false, maxTokens = 2048 } = options;
  const client = new OpenAI({ apiKey: config.apiKey });

  // o3/o4-mini/o3-mini models use "reasoning" format - need different params
  const isReasoningModel = /^o[34]/.test(config.model);

  try {
    const response = await client.chat.completions.create({
      model: config.model,
      ...(isReasoningModel
        ? { max_completion_tokens: maxTokens }
        : { max_tokens: maxTokens }),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      ...(expectJson && !isReasoningModel ? { response_format: { type: "json_object" } } : {}),
    });

    let text = response.choices[0]?.message?.content?.trim() ?? "";

    if (expectJson) {
      text = stripCodeFences(text);
    }

    return text;
  } catch (err: unknown) {
    if (err instanceof OpenAI.APIError) {
      throw mapOpenAIError(err);
    }
    throw err;
  }
}

async function chatWithGoogle(
  systemPrompt: string,
  userMessage: string,
  options: { expectJson?: boolean; maxTokens?: number },
  config: LLMConfig,
): Promise<string> {
  const { expectJson = false, maxTokens = 2048 } = options;
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(expectJson ? { responseMimeType: "application/json" } : {}),
    },
  });

  try {
    const result = await model.generateContent(userMessage);
    let text = result.response.text().trim();

    if (expectJson) {
      text = stripCodeFences(text);
    }

    return text;
  } catch (err: unknown) {
    throw mapGoogleError(err);
  }
}

// ── Error mappers ──

function mapAnthropicError(err: InstanceType<typeof Anthropic.APIError>): LLMServiceError {
  if (err.status === 401 || err.status === 403) {
    return new LLMServiceError(
      "API key authentication failed",
      "invalid_key",
    );
  }
  if (err.status === 402 || err.message?.includes("billing") || err.message?.includes("credit")) {
    return new LLMServiceError(
      "AI service billing limit reached",
      "billing",
    );
  }
  if (err.status === 429) {
    return new LLMServiceError(
      "AI service is temporarily busy",
      "rate_limit",
    );
  }
  if (err.status === 529 || err.status === 503) {
    return new LLMServiceError(
      "AI service is temporarily overloaded",
      "overloaded",
    );
  }
  return new LLMServiceError(err.message || "Unknown Anthropic error", "unknown");
}

function mapOpenAIError(err: InstanceType<typeof OpenAI.APIError>): LLMServiceError {
  if (err.status === 401 || err.status === 403) {
    return new LLMServiceError(
      "OpenAI API key authentication failed",
      "invalid_key",
    );
  }
  if (err.status === 402 || err.message?.includes("billing") || err.message?.includes("quota")) {
    return new LLMServiceError(
      "OpenAI billing limit reached",
      "billing",
    );
  }
  if (err.status === 429) {
    return new LLMServiceError(
      "OpenAI rate limit reached",
      "rate_limit",
    );
  }
  if (err.status === 503 || err.status === 500) {
    return new LLMServiceError(
      "OpenAI service is temporarily overloaded",
      "overloaded",
    );
  }
  return new LLMServiceError(err.message || "Unknown OpenAI error", "unknown");
}

function mapGoogleError(err: unknown): LLMServiceError {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("API_KEY_INVALID") || message.includes("403") || message.includes("401")) {
    return new LLMServiceError(
      "Google API key authentication failed",
      "invalid_key",
    );
  }
  if (message.includes("429") || message.includes("RATE_LIMIT")) {
    return new LLMServiceError(
      "Google API rate limit reached",
      "rate_limit",
    );
  }
  if (message.includes("QUOTA") || message.includes("billing")) {
    return new LLMServiceError(
      "Google API quota exceeded",
      "billing",
    );
  }
  if (message.includes("503") || message.includes("UNAVAILABLE")) {
    return new LLMServiceError(
      "Google AI service is temporarily overloaded",
      "overloaded",
    );
  }
  return new LLMServiceError(message, "unknown");
}

// ── Helpers ──

function stripCodeFences(text: string): string {
  if (text.startsWith("```")) {
    const lines = text.split("\n");
    const filtered = lines.filter((l) => !l.startsWith("```"));
    return filtered.join("\n").trim();
  }
  return text;
}

// ── Public API ──

export async function llmChat(
  systemPrompt: string,
  userMessage: string,
  options?: { expectJson?: boolean; maxTokens?: number },
  config?: LLMConfig,
): Promise<string> {
  const opts = {
    expectJson: options?.expectJson ?? false,
    maxTokens: options?.maxTokens ?? 2048,
  };

  // If no config provided, use default server Anthropic
  if (!config) {
    return chatWithAnthropic(systemPrompt, userMessage, opts);
  }

  switch (config.provider) {
    case "anthropic":
      return chatWithAnthropic(systemPrompt, userMessage, opts, config);
    case "openai":
      return chatWithOpenAI(systemPrompt, userMessage, opts, config);
    case "google":
      return chatWithGoogle(systemPrompt, userMessage, opts, config);
    default:
      throw new LLMServiceError(`Unsupported provider: ${config.provider}`, "config_error");
  }
}

export async function llmChatJson(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; retries?: number },
  config?: LLMConfig,
): Promise<Record<string, unknown>> {
  const { maxTokens = 2048, retries = 1 } = options ?? {};

  for (let attempt = 0; attempt <= retries; attempt++) {
    const text = await llmChat(systemPrompt, userMessage, {
      expectJson: true,
      maxTokens,
    }, config);
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      console.warn(
        `JSON parse failed (attempt ${attempt + 1}/${retries + 1}): ${text.slice(0, 200)}`,
      );
      if (attempt === retries) {
        throw new Error(`LLM JSON parse failed after retries: ${text.slice(0, 200)}`);
      }
    }
  }

  // unreachable
  throw new Error("LLM JSON parse failed after retries");
}
