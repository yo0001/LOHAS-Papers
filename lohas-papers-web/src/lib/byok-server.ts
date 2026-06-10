import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LLMConfig } from "@/lib/backend";
import { validateKeyFormat, type BYOKProvider } from "@/lib/byok-models";

interface EncryptedApiKey {
  v: 1;
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
}

export interface StoredBYOKConfig {
  provider: BYOKProvider;
  model: string;
  enabled: boolean;
  encryptedApiKey?: EncryptedApiKey;
  apiKey?: string; // Legacy plaintext value, migrated on read when possible.
}

export interface PublicBYOKConfig {
  provider: BYOKProvider;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
  maskedApiKey?: string;
}

export interface BYOKInputConfig {
  provider: BYOKProvider;
  model: string;
  enabled?: boolean;
  apiKey?: string;
}

function encryptionKey(): Buffer {
  const raw = process.env.BYOK_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("BYOK_ENCRYPTION_KEY not configured");
  }

  const hex = Buffer.from(raw, "hex");
  if (hex.length === 32 && /^[0-9a-f]+$/i.test(raw)) return hex;

  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32) return base64;

  return createHash("sha256").update(raw).digest();
}

function encryptApiKey(apiKey: string): EncryptedApiKey {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);
  return {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function decryptApiKey(encrypted: EncryptedApiKey): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(encrypted.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) return "*".repeat(apiKey.length);
  return `${apiKey.slice(0, 7)}***${apiKey.slice(-4)}`;
}

function isProvider(value: unknown): value is BYOKProvider {
  return value === "anthropic" || value === "openai" || value === "google";
}

export function parseStoredBYOKConfig(value: unknown): StoredBYOKConfig | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (!isProvider(record.provider) || typeof record.model !== "string") {
    return null;
  }

  const encrypted = record.encryptedApiKey;
  const encryptedApiKey =
    encrypted && typeof encrypted === "object"
      ? (encrypted as EncryptedApiKey)
      : undefined;

  return {
    provider: record.provider,
    model: record.model,
    enabled: record.enabled !== false,
    encryptedApiKey,
    apiKey: typeof record.apiKey === "string" ? record.apiKey : undefined,
  };
}

export function buildStoredBYOKConfig(
  input: BYOKInputConfig,
  existing?: StoredBYOKConfig | null,
): StoredBYOKConfig {
  const trimmedKey = input.apiKey?.trim();
  let encryptedApiKey = existing?.encryptedApiKey;

  if (trimmedKey) {
    if (!validateKeyFormat(input.provider, trimmedKey)) {
      throw new Error("Invalid API key format");
    }
    encryptedApiKey = encryptApiKey(trimmedKey);
  }

  if (!encryptedApiKey && existing?.apiKey) {
    if (!validateKeyFormat(input.provider, existing.apiKey)) {
      throw new Error("Invalid legacy API key format");
    }
    encryptedApiKey = encryptApiKey(existing.apiKey);
  }

  if (!encryptedApiKey) {
    throw new Error("Missing API key");
  }

  return {
    provider: input.provider,
    model: input.model,
    enabled: input.enabled ?? true,
    encryptedApiKey,
  };
}

export function toPublicBYOKConfig(
  config: StoredBYOKConfig | null,
): PublicBYOKConfig | null {
  if (!config) return null;

  let maskedApiKey: string | undefined;
  if (config.apiKey) {
    maskedApiKey = maskApiKey(config.apiKey);
  } else if (config.encryptedApiKey) {
    try {
      maskedApiKey = maskApiKey(decryptApiKey(config.encryptedApiKey));
    } catch {
      maskedApiKey = undefined;
    }
  }

  return {
    provider: config.provider,
    model: config.model,
    enabled: config.enabled,
    hasApiKey: Boolean(config.encryptedApiKey || config.apiKey),
    maskedApiKey,
  };
}

export function toLLMConfig(config: StoredBYOKConfig | null): LLMConfig | undefined {
  if (!config?.enabled) return undefined;

  const apiKey = config.encryptedApiKey
    ? decryptApiKey(config.encryptedApiKey)
    : config.apiKey;

  if (!apiKey || !validateKeyFormat(config.provider, apiKey)) return undefined;

  return {
    provider: config.provider,
    apiKey,
    model: config.model,
  };
}

export async function getUserBYOKConfig(
  userId: string,
): Promise<LLMConfig | undefined> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("byok_config")
    .eq("id", userId)
    .single();

  if (error) return undefined;
  return toLLMConfig(parseStoredBYOKConfig(data?.byok_config));
}
