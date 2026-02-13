import * as cache from "./cache";
import type { SemanticScholarPaperData, UnifiedPaper } from "./types";

const BASE_URL = "https://api.semanticscholar.org/graph/v1";
const FIELDS =
  "title,abstract,authors,year,citationCount,journal,isOpenAccess,openAccessPdf,externalIds,publicationTypes,tldr";
const TIMEOUT_MS = 10_000;

export async function searchPapers(
  query: string,
  options?: {
    limit?: number;
    yearFrom?: number | null;
    yearTo?: number | null;
  },
): Promise<UnifiedPaper[]> {
  const { limit = 20, yearFrom, yearTo } = options ?? {};
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY || "";

  const params = new URLSearchParams({
    query,
    limit: String(limit),
    fields: FIELDS,
  });

  if (yearFrom || yearTo) {
    const yFrom = yearFrom ?? "";
    const yTo = yearTo ?? "";
    params.set("year", `${yFrom}-${yTo}`);
  }

  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;

  const maxRetries = 3;
  let data: Record<string, unknown> | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const resp = await fetch(`${BASE_URL}/paper/search?${params}`, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!resp.ok) {
        if (resp.status === 429 && attempt < maxRetries - 1) {
          const wait = 2 ** attempt + 1;
          console.info(`Semantic Scholar 429, retrying in ${wait}s: ${query}`);
          await sleep(wait * 1000);
          continue;
        }
        console.warn(`Semantic Scholar HTTP error ${resp.status}: ${query}`);
        return [];
      }

      data = (await resp.json()) as Record<string, unknown>;
      break;
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        console.warn(`Semantic Scholar timeout for query: ${query}`);
        return [];
      }
      console.error(`Semantic Scholar unexpected error for query: ${query}`, err);
      return [];
    }
  }

  if (!data) return [];

  const items = (data.data ?? []) as SemanticScholarPaperData[];
  const papers: UnifiedPaper[] = [];

  for (const item of items) {
    if (!item) continue;
    const paperId = item.paperId ?? "";
    if (!paperId) continue;

    // Extract DOI from externalIds
    const externalIds = item.externalIds ?? {};
    const doi = externalIds.DOI || null;
    const pmid = externalIds.PubMed || null;

    // Extract authors
    const authorsRaw = item.authors ?? [];
    const authors = authorsRaw
      .map((a) => a.name ?? "")
      .filter((name) => name.length > 0);

    // Extract journal name
    const journalInfo = item.journal;
    const journal =
      journalInfo && typeof journalInfo === "object" ? journalInfo.name ?? null : null;

    // Open access PDF
    const oaPdf = item.openAccessPdf;
    const pdfUrl =
      oaPdf && typeof oaPdf === "object" ? oaPdf.url ?? null : null;

    papers.push({
      id: paperId,
      title: item.title ?? "",
      authors,
      journal,
      year: item.year ?? null,
      doi,
      pmid,
      citation_count: item.citationCount ?? 0,
      is_open_access: item.isOpenAccess ?? false,
      pdf_url: pdfUrl,
      abstract: item.abstract ?? null,
      source: "semantic_scholar",
    });

    // Pre-cache paper metadata so detail pages don't need to re-fetch
    await cache.setCachedPaperMetadata(paperId, item as unknown as Record<string, unknown>);
    if (pmid) {
      await cache.setCachedPaperMetadata(`pmid:${pmid}`, item as unknown as Record<string, unknown>);
    }
  }

  console.info(`Semantic Scholar returned ${papers.length} papers for: ${query}`);
  return papers;
}

/**
 * Fetch a single paper from Semantic Scholar by ID with cache and retry.
 */
export async function fetchPaper(
  paperId: string,
): Promise<SemanticScholarPaperData | null> {
  // Check cache first
  const cached = await cache.getCachedPaperMetadata(paperId);
  if (cached) return cached as unknown as SemanticScholarPaperData;

  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY || "";
  const fields =
    "title,abstract,authors,year,citationCount,referenceCount,journal,isOpenAccess,openAccessPdf,externalIds";
  const url = `${BASE_URL}/paper/${paperId}`;

  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const resp = await fetch(`${url}?fields=${fields}`, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (resp.status === 404) return null;

      if (resp.status === 429) {
        const wait = 1.0 * (attempt + 1);
        console.warn(
          `Semantic Scholar rate limited (429), retrying in ${wait}s (attempt ${attempt + 1}/${maxRetries})`,
        );
        await sleep(wait * 1000);
        continue;
      }

      if (!resp.ok) {
        console.warn(`Semantic Scholar HTTP error ${resp.status} for paper ${paperId}`);
        if (attempt < maxRetries - 1) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        return null;
      }

      const data = (await resp.json()) as SemanticScholarPaperData;
      // Cache paper metadata for 24 hours
      await cache.setCachedPaperMetadata(paperId, data as unknown as Record<string, unknown>);
      return data;
    } catch (err) {
      console.error(
        `Failed to fetch paper ${paperId} from Semantic Scholar (attempt ${attempt + 1}/${maxRetries})`,
        err,
      );
      if (attempt < maxRetries - 1) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
