import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

interface PersistentRateLimitRow {
  allowed: boolean;
  remaining: number;
  retry_after_ms: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

function hasPersistentRateLimitConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY !== "placeholder",
  );
}

function memoryRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key) || { timestamps: [] };

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxAttempts) {
    const oldest = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, windowMs - (now - oldest)),
    };
  }

  entry.timestamps.push(now);
  memoryStore.set(key, entry);

  return {
    allowed: true,
    remaining: maxAttempts - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!hasPersistentRateLimitConfig()) {
    return memoryRateLimit(key, maxAttempts, windowMs);
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .rpc("check_rate_limit", {
        p_limit_key: key,
        p_max_attempts: maxAttempts,
        p_window_ms: windowMs,
      })
      .single<PersistentRateLimitRow>();

    if (error || !data) {
      throw error ?? new Error("Missing rate limit result");
    }

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      retryAfterMs: data.retry_after_ms,
    };
  } catch (error) {
    console.error("Persistent rate limit failed:", error);

    if (process.env.NODE_ENV === "production") {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: windowMs,
      };
    }

    return memoryRateLimit(key, maxAttempts, windowMs);
  }
}
