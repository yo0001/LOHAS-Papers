/**
 * Main search handler: query transform -> paper search -> rank -> summarize.
 * This is the TypeScript equivalent of api/routes/search.py
 */

import * as cache from "./cache";
import * as paperSearcher from "./paper-searcher";
import * as queryTransformer from "./query-transformer";
import * as relevanceRanker from "./relevance-ranker";
import * as summarizer from "./summarizer";
import type { LLMConfig } from "./llm-client";
import type {
  AISummary,
  PaperResult,
  PaperSummaryMap,
  QueryTransformResult,
  RankedPaper,
  SearchFilters,
  SearchRequest,
  SearchResponse,
  UnifiedPaper,
} from "./types";

// Timeout per individual summary/overview task (milliseconds)
const SUMMARY_TIMEOUT_MS = 15_000;

function normalizeStudyType(studyType?: string | null): string {
  if (!studyType) return "";
  const t = studyType.trim().toLowerCase().replaceAll("_", "-");
  if (t === "systematic review" || t === "systematicreview") return "systematic-review";
  if (t === "meta analysis" || t === "metaanalysis") return "meta-analysis";
  if (t === "randomized" || t === "randomised" || t === "rct") return "rct";
  return t;
}

function relevanceScore(paperId: string, rankingMap: Map<string, RankedPaper>): number {
  return rankingMap.get(paperId)?.relevance_score ?? 0;
}

function sortPapers(
  papers: UnifiedPaper[],
  rankingMap: Map<string, RankedPaper>,
  sortBy: string,
): UnifiedPaper[] {
  const mode = (sortBy || "relevance").trim().toLowerCase();

  if (["citations", "citation", "citation_count", "most_cited"].includes(mode)) {
    return [...papers].sort(
      (a, b) =>
        (b.citation_count ?? 0) - (a.citation_count ?? 0) ||
        relevanceScore(b.id, rankingMap) - relevanceScore(a.id, rankingMap),
    );
  }

  if (["newest", "latest", "year", "year_desc"].includes(mode)) {
    return [...papers].sort(
      (a, b) =>
        (b.year ?? 0) - (a.year ?? 0) ||
        relevanceScore(b.id, rankingMap) - relevanceScore(a.id, rankingMap) ||
        (b.citation_count ?? 0) - (a.citation_count ?? 0),
    );
  }

  if (["oldest", "year_asc"].includes(mode)) {
    return [...papers].sort(
      (a, b) =>
        (a.year ?? 9999) - (b.year ?? 9999) ||
        relevanceScore(a.id, rankingMap) - relevanceScore(b.id, rankingMap) ||
        (a.citation_count ?? 0) - (b.citation_count ?? 0),
    );
  }

  // default: relevance
  return [...papers].sort(
    (a, b) =>
      relevanceScore(b.id, rankingMap) - relevanceScore(a.id, rankingMap) ||
      (b.citation_count ?? 0) - (a.citation_count ?? 0) ||
      (b.year ?? 0) - (a.year ?? 0),
  );
}

export async function handleSearch(request: SearchRequest, config?: LLMConfig): Promise<SearchResponse> {
  const {
    query,
    language = "ja",
    page = 1,
    per_page = 50,
    sort_by = "relevance",
    filters = {},
  } = request;

  const filterPayload: Record<string, unknown> = {
    year_from: filters.year_from ?? null,
    year_to: filters.year_to ?? null,
    study_type: filters.study_type ?? null,
    open_access_only: Boolean(filters.open_access_only),
  };

  // 1. Check search result cache
  const cached = await cache.getCachedSearch(query, page, per_page, language, sort_by, filterPayload);
  if (cached) {
    cached.cached = true;
    return cached as unknown as SearchResponse;
  }

  // 2. Transform query (with cache)
  const transformResult = await getOrTransformQuery(query, language, config);

  // 3. Search all sources in parallel
  let allPapers = await paperSearcher.searchAllSources(transformResult, {
    yearFrom: filters.year_from ?? null,
    yearTo: filters.year_to ?? null,
  });

  // Apply open-access filter before ranking
  if (filters.open_access_only) {
    allPapers = allPapers.filter((p) => p.is_open_access);
  }

  if (allPapers.length === 0) {
    return {
      ai_summary: {
        text: "",
        language,
        generated_queries: transformResult.academic_queries,
      },
      papers: [],
      total_results: 0,
      page,
      per_page,
    };
  }

  // 4. Run ranking + title translation in parallel
  const [rankingResult, translationResult] = await Promise.allSettled([
    relevanceRanker.rankPapers(query, transformResult.interpreted_intent, allPapers, config),
    summarizer.translateTitlesBatch(
      allPapers.map((p) => p.title),
      language,
      config,
    ),
  ]);

  const rankings: RankedPaper[] =
    rankingResult.status === "fulfilled" ? rankingResult.value : [];
  const allTranslatedTitles: string[] =
    translationResult.status === "fulfilled"
      ? translationResult.value
      : allPapers.map((p) => p.title);

  // Build title translation lookup
  const titleTranslationMap = new Map<string, string>();
  for (let i = 0; i < allPapers.length; i++) {
    if (i < allTranslatedTitles.length && allTranslatedTitles[i] !== allPapers[i].title) {
      titleTranslationMap.set(allPapers[i].id, allTranslatedTitles[i]);
    }
  }

  // 5. Build ranked paper lookup
  const rankingMap = new Map<string, RankedPaper>();
  for (const r of rankings) rankingMap.set(r.paper_id, r);

  // Apply study_type filter after ranking
  const requestedStudyType = normalizeStudyType(filters.study_type);
  const filteredByStudyType = requestedStudyType
    ? allPapers.filter((p) => normalizeStudyType(rankingMap.get(p.id)?.study_type) === requestedStudyType)
    : allPapers;

  // 6. Sort + paginate
  const sortedPapers = sortPapers(filteredByStudyType, rankingMap, sort_by);
  const totalResults = sortedPapers.length;

  const start = (page - 1) * per_page;
  const end = start + per_page;
  const pagePapers = sortedPapers.slice(start, end);

  // 7. Generate summaries + AI overview in parallel (with per-task timeout)
  const summaryTasks = pagePapers.map((paper) =>
    paper.abstract
      ? withTimeout(
          getOrGenerateSummary(paper.id, paper.abstract, language, paper.title, config),
          SUMMARY_TIMEOUT_MS,
        )
      : Promise.resolve(""),
  );

  const papersContext = buildPapersContext(pagePapers.slice(0, 5));
  const aiOverviewTask = withTimeout(
    summarizer.generateAiOverview(query, language, papersContext, config),
    SUMMARY_TIMEOUT_MS,
  );

  // Run all in parallel
  const allTasks = [aiOverviewTask, ...summaryTasks];
  const results = await Promise.allSettled(allTasks);

  const aiOverviewText =
    results[0].status === "fulfilled" ? results[0].value : "";
  const paperSummaries = results.slice(1);

  // 8. Build response
  const paperResults: PaperResult[] = pagePapers.map((paper, i) => {
    const rankInfo = rankingMap.get(paper.id);
    const summaryResult = paperSummaries[i];
    const summaryText =
      summaryResult.status === "fulfilled" ? summaryResult.value : "";

    const summaryMap: PaperSummaryMap = {};
    if (summaryText) {
      const lang = language as keyof PaperSummaryMap;
      if (["ja", "en", "ko", "es", "th", "vi"].includes(language)) {
        summaryMap[lang] = summaryText;
      } else if (language === "zh-Hans") {
        summaryMap["zh-Hans"] = summaryText;
      } else if (language === "pt-BR") {
        summaryMap["pt-BR"] = summaryText;
      }
    }

    return {
      id: paper.id,
      title: paper.title,
      title_translated: titleTranslationMap.get(paper.id) ?? null,
      authors: paper.authors,
      journal: paper.journal ?? null,
      year: paper.year ?? null,
      doi: paper.doi ?? null,
      citation_count: paper.citation_count,
      study_type: rankInfo?.study_type ?? null,
      evidence_level: rankInfo?.evidence_level ?? null,
      is_open_access: paper.is_open_access,
      pdf_url: paper.pdf_url ?? null,
      abstract_original: paper.abstract ?? null,
      summary: summaryMap,
      relevance_score: rankInfo?.relevance_score ?? 0.0,
      ai_relevance_reason: rankInfo?.reason ?? null,
    };
  });

  const response: SearchResponse = {
    ai_summary: {
      text: aiOverviewText,
      language,
      generated_queries: transformResult.academic_queries,
    },
    papers: paperResults,
    total_results: totalResults,
    page,
    per_page,
  };

  // 9. Cache the result with sort/filter aware key
  await cache.setCachedSearch(
    query,
    page,
    per_page,
    response as unknown as Record<string, unknown>,
    21600,
    language,
    sort_by,
    filterPayload,
  );

  // 10. Precaching disabled — was burning ~40 Claude API calls per search
  // (5 papers × 8 languages). Re-enable when usage justifies cost.
  // precacheTopPapers(pagePapers.slice(0, 5)).catch(() => {});

  return response;
}

// ── Helpers ──

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | string> {
  return Promise.race([
    promise,
    new Promise<string>((resolve) => {
      setTimeout(() => {
        console.warn(`Task timed out after ${timeoutMs}ms`);
        resolve("");
      }, timeoutMs);
    }),
  ]);
}

async function getOrTransformQuery(
  query: string,
  language: string,
  config?: LLMConfig,
): Promise<QueryTransformResult> {
  const cached = await cache.getCachedTransform(query, language);
  if (cached) return cached as unknown as QueryTransformResult;

  const result = await queryTransformer.transformQuery(query, language, config);
  await cache.setCachedTransform(query, result as unknown as Record<string, unknown>, 86400, language);
  return result;
}

async function getOrGenerateSummary(
  paperId: string,
  abstract: string,
  language: string,
  title: string = "",
  config?: LLMConfig,
): Promise<string> {
  const cached = await cache.getCachedSummary(paperId, language);
  if (cached) return cached;

  const summary = await summarizer.generatePaperSummary(abstract, language, title, config);
  if (summary) {
    await cache.setCachedSummary(paperId, language, summary);
  }
  return summary;
}

function buildPapersContext(papers: UnifiedPaper[]): string {
  return papers
    .map((p, i) => {
      const abstractPreview = (p.abstract ?? "").slice(0, 300);
      return (
        `${i + 1}. ${p.title} (${p.journal ?? "unknown"}, ${p.year ?? "unknown"})\n` +
        `   Citations: ${p.citation_count}\n` +
        `   Abstract: ${abstractPreview}\n`
      );
    })
    .join("\n");
}

async function precacheTopPapers(papers: UnifiedPaper[]): Promise<void> {
  const allLanguages = ["ja", "en", "zh-Hans", "ko", "es", "pt-BR", "th", "vi"];
  for (const paper of papers) {
    if (!paper.abstract) continue;
    for (const lang of allLanguages) {
      const cached = await cache.getCachedSummary(paper.id, lang);
      if (!cached) {
        try {
          const summary = await summarizer.generatePaperSummary(
            paper.abstract,
            lang,
            paper.title,
          );
          if (summary) {
            await cache.setCachedSummary(paper.id, lang, summary);
          }
        } catch {
          console.warn(`Precache failed for ${paper.id}/${lang}`);
        }
      }
    }
  }
}
