import * as pubmed from "./pubmed";
import * as semanticScholar from "./semantic-scholar";
import { deduplicatePapers } from "./deduplication";
import type { QueryTransformResult, UnifiedPaper } from "./types";

export async function searchAllSources(
  transformResult: QueryTransformResult,
  options?: {
    yearFrom?: number | null;
    yearTo?: number | null;
    limitPerQuery?: number;
  },
): Promise<UnifiedPaper[]> {
  const { yearFrom, yearTo, limitPerQuery = 20 } = options ?? {};
  const queries = getUniqueQueries(transformResult.academic_queries);
  const allPapers: UnifiedPaper[] = [];

  for (const query of queries) {
    try {
      const papers = await pubmed.searchPapers(query, {
        limit: limitPerQuery,
        yearFrom,
        yearTo,
      });
      allPapers.push(...papers);
    } catch (err) {
      console.warn(`PubMed search failed: ${query}`, err);
    }
  }

  const hasSemanticScholarKey = Boolean(process.env.SEMANTIC_SCHOLAR_API_KEY);
  if (hasSemanticScholarKey) {
    for (const query of queries) {
      try {
        const papers = await semanticScholar.searchPapers(query, {
          limit: limitPerQuery,
          yearFrom,
          yearTo,
        });
        allPapers.push(...papers);
      } catch (err) {
        console.warn(`Semantic Scholar search failed: ${query}`, err);
      }
    }
  } else {
    console.info(
      "Semantic Scholar search skipped: SEMANTIC_SCHOLAR_API_KEY is not configured",
    );
  }

  if (allPapers.length === 0) {
    const fallbackQuery = transformResult.original_query || queries[0];
    if (fallbackQuery && !queries.includes(fallbackQuery)) {
      try {
        const papers = await pubmed.searchPapers(fallbackQuery, {
          limit: limitPerQuery,
          yearFrom,
          yearTo,
        });
        allPapers.push(...papers);
      } catch (err) {
        console.warn(`PubMed fallback search failed: ${fallbackQuery}`, err);
      }
    }
  }

  console.info(`Total papers before dedup: ${allPapers.length}`);

  // Deduplicate
  const uniquePapers = deduplicatePapers(allPapers);
  console.info(`Total papers after dedup: ${uniquePapers.length}`);

  return uniquePapers;
}

function getUniqueQueries(queries: string[]): string[] {
  return Array.from(
    new Set(
      queries
        .map((query) => query.trim())
        .filter((query) => query.length > 0),
    ),
  );
}
