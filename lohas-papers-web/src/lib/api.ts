const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ── Types ──

export interface SearchFilters {
  year_from?: number | null;
  year_to?: number | null;
  study_type?: string | null;
  open_access_only?: boolean;
}

export interface PaperSummaryMap {
  ja?: string | null;
  en?: string | null;
  "zh-Hans"?: string | null;
  ko?: string | null;
  es?: string | null;
  "pt-BR"?: string | null;
  th?: string | null;
  vi?: string | null;
}

export interface PaperResult {
  id: string;
  title: string;
  title_translated?: string | null;
  authors: string[];
  journal?: string | null;
  year?: number | null;
  doi?: string | null;
  citation_count: number;
  study_type?: string | null;
  evidence_level?: string | null;
  is_open_access: boolean;
  pdf_url?: string | null;
  abstract_original?: string | null;
  summary: PaperSummaryMap;
  relevance_score: number;
  ai_relevance_reason?: string | null;
}

export interface AISummary {
  text: string;
  language: string;
  generated_queries: string[];
}

export interface SearchResponse {
  ai_summary: AISummary;
  papers: PaperResult[];
  total_results: number;
  page: number;
  per_page: number;
  cached: boolean;
}

export interface AuthorDetail {
  name: string;
  affiliation?: string | null;
}

export interface AbstractTranslations {
  expert?: string | null;
  layperson?: string | null;
  children?: string | null;
}

export interface PaperDetailResponse {
  paper_id: string;
  title_original: string;
  title_translated?: string | null;
  authors: AuthorDetail[];
  journal?: string | null;
  year?: number | null;
  doi?: string | null;
  abstract_original?: string | null;
  abstract_translated?: string | null;
  abstract_translations?: AbstractTranslations | null;
  summary?: string | null;
  key_findings: string[];
  citation_count: number;
  references_count: number;
  is_open_access: boolean;
  pdf_url?: string | null;
  semantic_scholar_url?: string | null;
  pubmed_url?: string | null;
}

export interface PaperSummaryResponse {
  paper_id: string;
  language: string;
  summary: string;
  cached: boolean;
  generated_at?: string | null;
}

export interface FulltextSection {
  section_name: string;
  original: string;
  translated: string;
}

export interface FulltextTranslationResponse {
  paper_id: string;
  language: string;
  difficulty: string;
  sections: FulltextSection[];
  cached: boolean;
}

export interface BatchSummaryItem {
  paper_id: string;
  summary: string;
  cached: boolean;
}

export interface BatchSummaryResponse {
  summaries: BatchSummaryItem[];
}

// ── API Client ──

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "APIError";
  }
}

export class AuthRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthRequiredError";
  }
}

export class InsufficientCreditsError extends Error {
  constructor(public required: number) {
    super("Insufficient credits");
    this.name = "InsufficientCreditsError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = API_BASE + path;
  const headers: Record<string, string> = { ...options?.headers as Record<string, string> };
  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    throw new APIError(res.status, `HTTP ${res.status}`);
  }

  return res.json();
}

export async function search(
  query: string,
  language: string,
  page: number = 1,
  perPage: number = 50,
  sortBy: string = "relevance",
  filters?: SearchFilters,
): Promise<SearchResponse> {
  return request<SearchResponse>("/search", {
    method: "POST",
    body: JSON.stringify({
      query,
      language,
      page,
      per_page: perPage,
      sort_by: sortBy,
      filters: filters ?? {},
    }),
  });
}

export async function getPaperSummary(
  paperId: string,
  language: string,
): Promise<PaperSummaryResponse> {
  const encodedId = encodeURIComponent(paperId);
  return request<PaperSummaryResponse>(
    `/paper/${encodedId}/summary?language=${language}`,
  );
}

export async function getPaperDetail(
  paperId: string,
  language: string,
): Promise<PaperDetailResponse> {
  const encodedId = encodeURIComponent(paperId);
  return request<PaperDetailResponse>(
    `/paper/${encodedId}/detail?language=${language}`,
  );
}

export async function getFulltextTranslation(
  paperId: string,
  language: string,
  difficulty: string,
): Promise<FulltextTranslationResponse> {
  const encodedId = encodeURIComponent(paperId);
  return request<FulltextTranslationResponse>(
    `/paper/${encodedId}/fulltext?language=${language}&difficulty=${difficulty}`,
  );
}

export async function batchSummaries(
  paperIds: string[],
  language: string,
): Promise<BatchSummaryResponse> {
  return request<BatchSummaryResponse>("/summary/batch", {
    method: "POST",
    body: JSON.stringify({ paper_ids: paperIds, language }),
  });
}

export async function healthCheck(): Promise<{ status: string }> {
  return request<{ status: string }>("/health".replace("/api/v1", ""));
}

export function getSummaryForLocale(
  summary: PaperSummaryMap,
  locale: string,
): string | null {
  return (summary as Record<string, string | null | undefined>)[locale] ?? null;
}

// ── Auth-aware API (via Next.js proxy with credit deduction) ──

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...options?.headers as Record<string, string> };
  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) throw new AuthRequiredError();
  if (res.status === 402) {
    const data = await res.json();
    throw new InsufficientCreditsError(data.required || 0);
  }
  if (!res.ok) throw new APIError(res.status, `HTTP ${res.status}`);

  return res.json();
}

export async function searchWithAI(
  query: string,
  language: string,
  page: number = 1,
  perPage: number = 50,
  sortBy: string = "relevance",
  filters?: SearchFilters,
): Promise<SearchResponse & { credits_remaining?: number }> {
  return authRequest("/api/ai/search", {
    method: "POST",
    body: JSON.stringify({
      query,
      language,
      page,
      per_page: perPage,
      sort_by: sortBy,
      filters: filters ?? {},
    }),
  });
}

export async function getPaperDetailWithAI(
  paperId: string,
  language: string,
): Promise<PaperDetailResponse & { credits_remaining?: number }> {
  const encodedId = encodeURIComponent(paperId);
  return authRequest(`/api/ai/paper/${encodedId}/detail?language=${language}`);
}

export async function getFulltextTranslationWithAI(
  paperId: string,
  language: string,
  difficulty: string,
): Promise<FulltextTranslationResponse & { credits_remaining?: number }> {
  const encodedId = encodeURIComponent(paperId);
  return authRequest(
    `/api/ai/paper/${encodedId}/fulltext?language=${language}&difficulty=${difficulty}`,
  );
}
