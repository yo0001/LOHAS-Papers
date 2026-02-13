import Anthropic from "@anthropic-ai/sdk";

const LLM_MODEL = process.env.LLM_MODEL || "claude-sonnet-4-5-20250929";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export async function llmChat(
  systemPrompt: string,
  userMessage: string,
  options?: { expectJson?: boolean; maxTokens?: number },
): Promise<string> {
  const { expectJson = false, maxTokens = 2048 } = options ?? {};
  const client = getClient();

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
