export interface FavoritePaper {
  id: string;
  title: string;
  titleTranslated?: string;
  authors: string[];
  journal?: string;
  year?: number;
  citationCount: number;
  savedAt: string;
}

const STORAGE_KEY = "lohas_favorites";

export function getFavorites(): FavoritePaper[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addFavorite(paper: FavoritePaper): void {
  const favorites = getFavorites();
  if (favorites.some((f) => f.id === paper.id)) return;
  favorites.unshift(paper);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function removeFavorite(paperId: string): void {
  const favorites = getFavorites().filter((f) => f.id !== paperId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function isFavorite(paperId: string): boolean {
  return getFavorites().some((f) => f.id === paperId);
}

// Search history
const HISTORY_KEY = "lohas_search_history";
const MAX_HISTORY = 10;

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addSearchHistory(query: string): void {
  const history = getSearchHistory().filter((h) => h !== query);
  history.unshift(query);
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearSearchHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

// Search result cache (per user, 7-day expiry, max 50 entries)
const CACHE_KEY = "lohas_search_cache";
const CACHE_MAX = 50;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

function getCacheStore(): Record<string, CacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCacheStore(store: Record<string, CacheEntry>): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(store));
}

export function getCachedResult(query: string, locale: string): unknown | null {
  const store = getCacheStore();
  const key = `${query.toLowerCase().trim()}_${locale}`;
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    delete store[key];
    saveCacheStore(store);
    return null;
  }
  return entry.data;
}

export function setCachedResult(query: string, locale: string, data: unknown): void {
  const store = getCacheStore();
  const key = `${query.toLowerCase().trim()}_${locale}`;
  store[key] = { data, timestamp: Date.now() };

  // Evict oldest entries if over limit
  const keys = Object.keys(store);
  if (keys.length > CACHE_MAX) {
    const sorted = keys.sort((a, b) => store[a].timestamp - store[b].timestamp);
    for (let i = 0; i < keys.length - CACHE_MAX; i++) {
      delete store[sorted[i]];
    }
  }
  saveCacheStore(store);
}
