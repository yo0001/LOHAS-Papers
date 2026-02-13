import Anthropic from "@anthropic-ai/sdk";

const LLM_MODEL = process.env.LLM_MODEL || "claude-sonnet-4-5-20250929";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
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
  code: "billing" | "rate_limit" | "overloaded" | "config_error" | "unknown";
  constructor(
    message: string,
    code: LLMServiceError["code"] = "unknown",
  ) {
    super(message);
    this.name = "LLMServiceError";
    this.code = code;
  }
}

export async function llmChat(
  systemPrompt: string,
  userMessage: string,
  options?: { expectJson?: boolean; maxTokens?: number },
): Promise<string> {
  const { expectJson = false, maxTokens = 2048 } = options ?? {};
  const client = getClient();

  try {
    const response = await client.messages.create({
      model: LLM_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    let text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    if (expectJson) {
      // Strip markdown code fences if present
      if (text.startsWith("```")) {
        const lines = text.split("\n");
        const filtered = lines.filter((l) => !l.startsWith("```"));
        text = filtered.join("\n").trim();
      }
    }

    return text;
  } catch (err: unknown) {
    // Handle Anthropic API errors with specific codes
    if (err instanceof Anthropic.APIError) {
      if (err.status === 401 || err.status === 403) {
        console.error("Anthropic API auth error:", err.message);
        throw new LLMServiceError(
          "AI service authentication failed",
          "billing",
        );
      }
      if (err.status === 402 || err.message?.includes("billing") || err.message?.includes("credit")) {
        console.error("Anthropic API billing error:", err.message);
        throw new LLMServiceError(
          "AI service billing limit reached",
          "billing",
        );
      }
      if (err.status === 429) {
        console.warn("Anthropic API rate limited:", err.message);
        throw new LLMServiceError(
          "AI service is temporarily busy",
          "rate_limit",
        );
      }
      if (err.status === 529 || err.status === 503) {
        console.warn("Anthropic API overloaded:", err.message);
        throw new LLMServiceError(
          "AI service is temporarily overloaded",
          "overloaded",
        );
      }
    }
    // Re-throw unknown errors
    throw err;
  }
}

export async function llmChatJson(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; retries?: number },
): Promise<Record<string, unknown>> {
  const { maxTokens = 2048, retries = 1 } = options ?? {};

  for (let attempt = 0; attempt <= retries; attempt++) {
    const text = await llmChat(systemPrompt, userMessage, {
      expectJson: true,
      maxTokens,
    });
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
