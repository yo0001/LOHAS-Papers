/**
 * Main search handler: query transform -> paper search -> rank -> summarize.
 * This is the TypeScript equivalent of api/routes/search.py
 */

import * as cache from "./cache";
import * as paperSearcher from "./paper-searcher";
import * as queryTransformer from "./query-transformer";
import * as relevanceRanker from "./relevance-ranker";
import * as summarizer from "./summarizer";
import type {
  AISummary,
  PaperResult,
  PaperSummaryMap,
  QueryTransformResult,
  RankedPaper,
  SearchRequest,
  SearchResponse,
  UnifiedPaper,
} from "./types";

// Timeout per individual summary/overview task (milliseconds)
const SUMMARY_TIMEOUT_MS = 15_000;

export async function handleSearch(request: SearchRequest): Promise<SearchResponse> {
  const {
    query,
    language = "ja",
    page = 1,
    per_page = 50,
    filters = {},
  } = request;

  // 1. Check search result cache
  const cached = await cache.getCachedSearch(query, page, per_page, language);
  if (cached) {
    cached.cached = true;
    return cached as unknown as SearchResponse;
  }

  // 2. Transform query (with cache)
  const transformResult = await getOrTransformQuery(query, language);

  // 3. Search all sources in parallel
  const allPapers = await paperSearcher.searchAllSources(transformResult, {
    yearFrom: filters.year_from ?? null,
    yearTo: filters.year_to ?? null,
  });

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
    relevanceRanker.rankPapers(query, transformResult.interpreted_intent, allPapers),
    summarizer.translateTitlesBatch(
      allPapers.map((p) => p.title),
      language,
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
  const paperMap = new Map<string, UnifiedPaper>();
  for (const p of allPapers) paperMap.set(p.id, p);

  // Sort papers by relevance score
  const rankedIds = [...rankings]
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .map((r) => r.paper_id);

  // Add un-ranked papers at the end
  for (const p of allPapers) {
    if (!rankingMap.has(p.id)) rankedIds.push(p.id);
  }

  const totalResults = rankedIds.length;

  // 6. Paginate
  const start = (page - 1) * per_page;
  const end = start + per_page;
  const pageIds = rankedIds.slice(start, end);
  const pagePapers = pageIds
    .map((pid) => paperMap.get(pid))
    .filter((p): p is UnifiedPaper => p !== undefined);

  // 7. Generate summaries + AI overview in parallel (with per-task timeout)
  const summaryTasks = pagePapers.map((paper) =>
    paper.abstract
      ? withTimeout(
          getOrGenerateSummary(paper.id, paper.abstract, language, paper.title),
          SUMMARY_TIMEOUT_MS,
        )
      : Promise.resolve(""),
  );

  const papersContext = buildPapersContext(pagePapers.slice(0, 5));
  const aiOverviewTask = withTimeout(
    summarizer.generateAiOverview(query, language, papersContext),
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

  // 9. Cache the result
  await cache.setCachedSearch(
    query,
    page,
    per_page,
    response as unknown as Record<string, unknown>,
    21600,
    language,
  );

  // 10. Background: precache top 5 papers in all languages (fire and forget)
  precacheTopPapers(pagePapers.slice(0, 5)).catch(() => {});

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
): Promise<QueryTransformResult> {
  const cached = await cache.getCachedTransform(query);
  if (cached) return cached as unknown as QueryTransformResult;

  const result = await queryTransformer.transformQuery(query, language);
  await cache.setCachedTransform(query, result as unknown as Record<string, unknown>);
  return result;
}

async function getOrGenerateSummary(
  paperId: string,
  abstract: string,
  language: string,
  title: string = "",
): Promise<string> {
  const cached = await cache.getCachedSummary(paperId, language);
  if (cached) return cached;

  const summary = await summarizer.generatePaperSummary(abstract, language, title);
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
