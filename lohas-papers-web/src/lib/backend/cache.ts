/**
 * In-memory cache for Vercel serverless environment.
 *
 * NOTE: This cache is per-instance and NOT shared across serverless invocations.
 * In production, consider migrating to Vercel KV or Upstash Redis.
 * For now, it provides per-request dedup within a single invocation
 * and a small benefit for warm instances.
 */

const store = new Map<string, { value: string; expiresAt: number | null }>();

function makeKey(prefix: string, ...parts: string[]): string {
  // Simple hash-like key
  const raw = parts.join(":");
  return `${prefix}:${raw}`;
}

function get(key: string): string | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key: string, value: string, ttlSeconds?: number): void {
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  store.set(key, { value, expiresAt });
}

// ── Search result cache ──

export async function getCachedSearch(
  query: string,
  page: number,
  perPage: number,
  language: string = "",
): Promise<Record<string, unknown> | null> {
  const key = makeKey("search", query.toLowerCase().trim(), String(page), String(perPage), language);
  const data = get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCachedSearch(
  query: string,
  page: number,
  perPage: number,
  data: Record<string, unknown>,
  ttl: number = 21600,
  language: string = "",
): Promise<void> {
  const key = makeKey("search", query.toLowerCase().trim(), String(page), String(perPage), language);
  set(key, JSON.stringify(data), ttl);
}

// ── Query transform cache ──

export async function getCachedTransform(query: string): Promise<Record<string, unknown> | null> {
  const key = makeKey("transform", query.toLowerCase().trim());
  const data = get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCachedTransform(
  query: string,
  data: Record<string, unknown>,
  ttl: number = 86400,
): Promise<void> {
  const key = makeKey("transform", query.toLowerCase().trim());
  set(key, JSON.stringify(data), ttl);
}

// ── Summary cache ──

export async function getCachedSummary(paperId: string, language: string): Promise<string | null> {
  const key = `summary:${paperId}:${language}`;
  return get(key);
}

export async function setCachedSummary(paperId: string, language: string, summary: string): Promise<void> {
  const key = `summary:${paperId}:${language}`;
  set(key, summary); // No TTL — summaries don't change
}

// ── Abstract translation cache ──

export async function getCachedTranslation(
  paperId: string,
  language: string,
  difficulty: string,
): Promise<string | null> {
  const key = `translation:${paperId}:${language}:${difficulty}`;
  return get(key);
}

export async function setCachedTranslation(
  paperId: string,
  language: string,
  difficulty: string,
  text: string,
): Promise<void> {
  const key = `translation:${paperId}:${language}:${difficulty}`;
  set(key, text);
}

// ── Paper metadata cache (Semantic Scholar) ──

export async function getCachedPaperMetadata(paperId: string): Promise<Record<string, unknown> | null> {
  const key = `paper_meta:${paperId}`;
  const data = get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCachedPaperMetadata(
  paperId: string,
  data: Record<string, unknown>,
  ttl: number = 86400,
): Promise<void> {
  const key = `paper_meta:${paperId}`;
  set(key, JSON.stringify(data), ttl);
}

// ── Fulltext translation cache ──

export async function getCachedFulltext(
  paperId: string,
  language: string,
  difficulty: string,
): Promise<string | null> {
  const key = `fulltext:${paperId}:${language}:${difficulty}`;
  return get(key);
}

export async function setCachedFulltext(
  paperId: string,
  language: string,
  difficulty: string,
  data: string,
): Promise<void> {
  const key = `fulltext:${paperId}:${language}:${difficulty}`;
  set(key, data);
}
