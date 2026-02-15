/**
 * Paper detail and fulltext handlers.
 * TypeScript equivalent of api/routes/paper.py
 */

import type { LLMConfig } from "./llm-client";
import * as cache from "./cache";
import { extractTextFromUrl, splitIntoSections } from "./pdf-extractor";
import { fetchPaper } from "./semantic-scholar";
import {
  generatePaperSummary,
  translateAbstract,
  translateFulltextSections,
} from "./summarizer";
import type {
  AbstractTranslations,
  AuthorDetail,
  FulltextSection,
  FulltextTranslationResponse,
  PaperDetailResponse,
  PaperSummaryResponse,
  SemanticScholarPaperData,
} from "./types";

// ── Paper Summary ──

export async function handlePaperSummary(
  paperId: string,
  language: string = "ja",
): Promise<PaperSummaryResponse> {
  // Check cache
  const cached = await cache.getCachedSummary(paperId, language);
  if (cached) {
    return {
      paper_id: paperId,
      language,
      summary: cached,
      cached: true,
    };
  }

  // Fetch paper abstract from Semantic Scholar
  const paperData = await fetchPaper(paperId);
  if (!paperData || !paperData.abstract) {
    throw new Error("Paper not found or no abstract available");
  }

  const abstract = paperData.abstract;
  const title = paperData.title ?? "";

  // Generate summary
  const summary = await generatePaperSummary(abstract, language, title);
  if (!summary) {
    throw new Error("Failed to generate summary");
  }

  // Cache it
  await cache.setCachedSummary(paperId, language, summary);

  return {
    paper_id: paperId,
    language,
    summary,
    cached: false,
  };
}

// ── Paper Detail ──

export async function handlePaperDetail(
  paperId: string,
  language: string = "ja",
  config?: LLMConfig,
): Promise<PaperDetailResponse> {
  const paperData = await fetchPaper(paperId);
  if (!paperData) {
    throw new Error("Paper not found");
  }

  const abstract = paperData.abstract ?? "";
  const title = paperData.title ?? "";
  let summary = "";
  let abstractTranslated: string | null = null;
  let abstractTranslations: AbstractTranslations | null = null;

  if (abstract) {
    // Get or generate summary
    const cachedSummary = await cache.getCachedSummary(paperId, language);
    if (cachedSummary) {
      summary = cachedSummary;
    } else {
      summary = await generatePaperSummary(abstract, language, title, config);
      if (summary) {
        await cache.setCachedSummary(paperId, language, summary);
      }
    }

    // For non-English languages, the abstract translation is the summary itself
    if (language !== "en") {
      abstractTranslated = summary;
    }

    // Generate 3-level abstract translations
    abstractTranslations = await getAbstractTranslations(
      paperId,
      abstract,
      language,
      title,
      config,
    );
  }

  // Parse authors
  const authorsRaw = paperData.authors ?? [];
  const authors: AuthorDetail[] = authorsRaw.map((a) => ({
    name: a.name ?? "",
    affiliation: a.affiliations?.[0] ?? null,
  }));

  // Journal
  const journalInfo = paperData.journal;
  const journal =
    journalInfo && typeof journalInfo === "object"
      ? journalInfo.name ?? null
      : null;

  // External IDs
  const externalIds = paperData.externalIds ?? {};
  const doi = externalIds.DOI ?? null;
  const pmid = externalIds.PubMed ?? null;

  // URLs
  const semanticScholarUrl = `https://www.semanticscholar.org/paper/${paperId}`;
  const pubmedUrl = pmid
    ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}`
    : null;

  // Open access PDF
  const oaPdf = paperData.openAccessPdf;
  const pdfUrl =
    oaPdf && typeof oaPdf === "object" ? oaPdf.url ?? null : null;

  return {
    paper_id: paperId,
    title_original: title,
    title_translated: null,
    authors,
    journal,
    year: paperData.year ?? null,
    doi,
    abstract_original: abstract || null,
    abstract_translated: abstractTranslated,
    abstract_translations: abstractTranslations,
    summary,
    key_findings: [],
    citation_count: paperData.citationCount ?? 0,
    references_count: paperData.referenceCount ?? 0,
    is_open_access: paperData.isOpenAccess ?? false,
    pdf_url: pdfUrl,
    semantic_scholar_url: semanticScholarUrl,
    pubmed_url: pubmedUrl,
  };
}

// ── Fulltext ──

export async function handleFulltext(
  paperId: string,
  language: string = "ja",
  difficulty: string = "layperson",
  config?: LLMConfig,
): Promise<FulltextTranslationResponse> {
  // Validate difficulty
  if (!["expert", "layperson", "children"].includes(difficulty)) {
    difficulty = "layperson";
  }

  // Check fulltext cache first
  const cachedData = await cache.getCachedFulltext(paperId, language, difficulty);
  if (cachedData) {
    const sectionsRaw = JSON.parse(cachedData) as FulltextSection[];
    return {
      paper_id: paperId,
      language,
      difficulty,
      sections: sectionsRaw,
      cached: true,
    };
  }

  // Fetch paper metadata to get PDF URL
  const paperData = await fetchPaper(paperId);
  if (!paperData) {
    throw new Error("Paper not found");
  }

  const oaPdf = paperData.openAccessPdf;
  const pdfUrl =
    oaPdf && typeof oaPdf === "object" ? oaPdf.url ?? null : null;
  if (!pdfUrl) {
    throw new Error("No PDF available for this paper (not open access)");
  }

  // Extract text from PDF
  const fullText = await extractTextFromUrl(pdfUrl);

  // Split into sections
  const sections = splitIntoSections(fullText);
  console.info(
    `Paper ${paperId}: extracted ${sections.length} sections from PDF`,
  );

  // Translate all sections in parallel
  const translated = await translateFulltextSections(sections, language, difficulty, config);

  // Cache the result
  await cache.setCachedFulltext(
    paperId,
    language,
    difficulty,
    JSON.stringify(translated),
  );

  return {
    paper_id: paperId,
    language,
    difficulty,
    sections: translated.map((s) => ({
      section_name: s.section_name,
      original: s.original,
      translated: s.translated,
    })),
    cached: false,
  };
}

// ── Helpers ──

async function getAbstractTranslations(
  paperId: string,
  abstract: string,
  language: string,
  title: string,
  config?: LLMConfig,
): Promise<AbstractTranslations> {
  const difficulties = ["expert", "layperson", "children"] as const;

  // Check cache for all 3 levels
  const cached: Record<string, string | null> = {};
  for (const d of difficulties) {
    cached[d] = await cache.getCachedTranslation(paperId, language, d);
  }

  const uncached = difficulties.filter((d) => !cached[d]);

  if (uncached.length > 0) {
    // For English expert level, just use the original abstract
    const uncachedFiltered = [...uncached];
    if (language === "en" && uncachedFiltered.includes("expert")) {
      cached.expert = abstract;
      await cache.setCachedTranslation(paperId, language, "expert", abstract);
      const idx = uncachedFiltered.indexOf("expert");
      if (idx !== -1) uncachedFiltered.splice(idx, 1);
    }

    // Generate uncached translations in parallel
    if (uncachedFiltered.length > 0) {
      const tasks = uncachedFiltered.map((d) =>
        translateAbstract(abstract, language, d, title, config),
      );
      const results = await Promise.allSettled(tasks);

      for (let i = 0; i < uncachedFiltered.length; i++) {
        const d = uncachedFiltered[i];
        const result = results[i];
        if (result.status === "fulfilled") {
          cached[d] = result.value || "";
          if (cached[d]) {
            await cache.setCachedTranslation(paperId, language, d, cached[d]!);
          }
        } else {
          console.warn(`Translation failed for ${d}/${language}:`, result.reason);
          cached[d] = "";
        }
      }
    }
  }

  return {
    expert: cached.expert || null,
    layperson: cached.layperson || null,
    children: cached.children || null,
  };
}

// ── Batch Summary (from summary.py) ──

export async function handleBatchSummary(
  paperIds: string[],
  language: string,
): Promise<Array<{ paper_id: string; summary: string; cached: boolean }>> {
  async function getOne(
    paperId: string,
  ): Promise<{ paper_id: string; summary: string; cached: boolean }> {
    // Check cache first
    const cached = await cache.getCachedSummary(paperId, language);
    if (cached) {
      return { paper_id: paperId, summary: cached, cached: true };
    }

    // Fetch abstract
    const paperData = await fetchPaper(paperId);
    if (!paperData?.abstract) {
      return { paper_id: paperId, summary: "", cached: false };
    }

    const summary = await generatePaperSummary(
      paperData.abstract,
      language,
      paperData.title ?? "",
    );
    if (summary) {
      await cache.setCachedSummary(paperId, language, summary);
    }

    return { paper_id: paperId, summary, cached: false };
  }

  const results = await Promise.allSettled(paperIds.map(getOne));

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    console.warn(`Batch summary failed for ${paperIds[i]}:`, result.reason);
    return { paper_id: paperIds[i], summary: "", cached: false };
  });
}
