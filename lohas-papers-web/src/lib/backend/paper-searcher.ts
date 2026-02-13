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
  const queries = transformResult.academic_queries;

  // Fire all queries to both sources in parallel
  const tasks: Promise<UnifiedPaper[]>[] = [];
  for (const query of queries) {
    tasks.push(
      semanticScholar.searchPapers(query, {
        limit: limitPerQuery,
        yearFrom,
        yearTo,
      }),
    );
    tasks.push(
      pubmed.searchPapers(query, {
        limit: limitPerQuery,
        yearFrom,
        yearTo,
      }),
    );
  }

  const results = await Promise.allSettled(tasks);

  const allPapers: UnifiedPaper[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      allPapers.push(...result.value);
    } else {
      console.warn(`Search task ${i} failed:`, result.reason);
    }
  }

  console.info(`Total papers before dedup: ${allPapers.length}`);

  // Deduplicate
  const uniquePapers = deduplicatePapers(allPapers);
  console.info(`Total papers after dedup: ${uniquePapers.length}`);

  return uniquePapers;
}
