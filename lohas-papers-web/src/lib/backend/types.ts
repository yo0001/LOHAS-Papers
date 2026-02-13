// ── Request Models ──

export interface SearchFilters {
  year_from?: number | null;
  year_to?: number | null;
  study_type?: string | null;
  open_access_only?: boolean;
}

export interface SearchRequest {
  query: string;
  language?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  filters?: SearchFilters;
}

export interface BatchSummaryRequest {
  paper_ids: string[];
  language: string;
}

// ── Response Models ──

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
  cached?: boolean;
}

export interface PaperSummaryResponse {
  paper_id: string;
  language: string;
  summary: string;
  cached?: boolean;
  generated_at?: string | null;
}

export interface BatchSummaryItem {
  paper_id: string;
  summary: string;
  cached?: boolean;
}

export interface BatchSummaryResponse {
  summaries: BatchSummaryItem[];
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

// ── Internal Models ──

export interface QueryTransformResult {
  original_query: string;
  interpreted_intent: string;
  academic_queries: string[];
  mesh_terms: string[];
  key_concepts: Record<string, string[]>;
}

export interface RankedPaper {
  paper_id: string;
  relevance_score: number;
  evidence_level: string;
  study_type: string;
  reason: string;
}

export interface RankingResult {
  rankings: RankedPaper[];
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
  cached?: boolean;
}

export interface UnifiedPaper {
  id: string;
  title: string;
  authors: string[];
  journal?: string | null;
  year?: number | null;
  doi?: string | null;
  pmid?: string | null;
  citation_count: number;
  is_open_access: boolean;
  pdf_url?: string | null;
  abstract?: string | null;
  source: string;
}

// ── Semantic Scholar raw types ──

export interface SemanticScholarPaperData {
  paperId?: string;
  title?: string;
  abstract?: string;
  authors?: Array<{ name?: string; affiliations?: string[] }>;
  year?: number;
  citationCount?: number;
  referenceCount?: number;
  journal?: { name?: string } | null;
  isOpenAccess?: boolean;
  openAccessPdf?: { url?: string } | null;
  externalIds?: Record<string, string>;
  publicationTypes?: string[];
  tldr?: { text?: string };
}
