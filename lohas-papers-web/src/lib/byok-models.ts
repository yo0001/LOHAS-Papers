export type BYOKProvider = "anthropic" | "openai" | "google";

export interface BYOKModel {
  id: string;
  name: string;
  provider: BYOKProvider;
  inputPrice: number;  // per million tokens
  outputPrice: number; // per million tokens
  recommended?: boolean;
}

export const BYOK_PROVIDERS: { id: BYOKProvider; name: string; keyPrefix: string; keyHint: string }[] = [
  { id: "anthropic", name: "Anthropic Claude", keyPrefix: "sk-ant-", keyHint: "sk-ant-api03-..." },
  { id: "openai", name: "OpenAI", keyPrefix: "sk-", keyHint: "sk-..." },
  { id: "google", name: "Google Gemini", keyPrefix: "AI", keyHint: "AIza..." },
];

export const BYOK_MODELS: BYOKModel[] = [
  // Anthropic Claude
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "anthropic", inputPrice: 15, outputPrice: 75 },
  { id: "claude-opus-4-5", name: "Claude Opus 4.5", provider: "anthropic", inputPrice: 15, outputPrice: 75 },
  { id: "claude-opus-4-1", name: "Claude Opus 4.1", provider: "anthropic", inputPrice: 15, outputPrice: 75 },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "anthropic", inputPrice: 3, outputPrice: 15, recommended: true },
  { id: "claude-sonnet-4-0", name: "Claude Sonnet 4", provider: "anthropic", inputPrice: 3, outputPrice: 15 },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "anthropic", inputPrice: 1, outputPrice: 5 },
  { id: "claude-3-5-haiku", name: "Claude Haiku 3.5", provider: "anthropic", inputPrice: 0.8, outputPrice: 4 },

  // OpenAI
  { id: "gpt-5.2", name: "GPT-5.2", provider: "openai", inputPrice: 1.75, outputPrice: 14 },
  { id: "gpt-5.1", name: "GPT-5.1", provider: "openai", inputPrice: 1.25, outputPrice: 10 },
  { id: "gpt-5", name: "GPT-5", provider: "openai", inputPrice: 1.25, outputPrice: 10 },
  { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openai", inputPrice: 0.25, outputPrice: 2, recommended: true },
  { id: "gpt-5-nano", name: "GPT-5 Nano", provider: "openai", inputPrice: 0.05, outputPrice: 0.4 },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "openai", inputPrice: 2, outputPrice: 8 },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "openai", inputPrice: 0.4, outputPrice: 1.6 },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", inputPrice: 2.5, outputPrice: 10 },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", inputPrice: 0.15, outputPrice: 0.6 },
  { id: "o3", name: "o3", provider: "openai", inputPrice: 2, outputPrice: 8 },
  { id: "o4-mini", name: "o4-mini", provider: "openai", inputPrice: 1.1, outputPrice: 4.4 },
  { id: "o3-mini", name: "o3-mini", provider: "openai", inputPrice: 1.1, outputPrice: 4.4 },

  // Google Gemini
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "google", inputPrice: 2, outputPrice: 12 },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "google", inputPrice: 0.5, outputPrice: 3, recommended: true },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", inputPrice: 1.25, outputPrice: 10 },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", inputPrice: 0.3, outputPrice: 2.5 },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite", provider: "google", inputPrice: 0.1, outputPrice: 0.4 },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", inputPrice: 0.1, outputPrice: 0.4 },
];

export function getModelsForProvider(provider: BYOKProvider): BYOKModel[] {
  return BYOK_MODELS.filter((m) => m.provider === provider);
}

export function getDefaultModel(provider: BYOKProvider): BYOKModel {
  return (
    BYOK_MODELS.find((m) => m.provider === provider && m.recommended) ||
    BYOK_MODELS.find((m) => m.provider === provider)!
  );
}

export function formatPrice(price: number): string {
  if (price < 1) return `$${price.toFixed(2)}`;
  return `$${price}`;
}

export function validateKeyFormat(provider: BYOKProvider, key: string): boolean {
  switch (provider) {
    case "anthropic":
      return key.startsWith("sk-ant-");
    case "openai":
      return key.startsWith("sk-");
    case "google":
      return key.startsWith("AI");
    default:
      return false;
  }
}
