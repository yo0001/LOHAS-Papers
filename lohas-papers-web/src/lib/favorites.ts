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
