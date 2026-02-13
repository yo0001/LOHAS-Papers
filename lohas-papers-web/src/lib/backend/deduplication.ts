import type { UnifiedPaper } from "./types";

function normalizeTitle(title: string): string {
  let t = title.toLowerCase();
  t = t.replace(/[^\w\s]/g, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function mergePapers(existing: UnifiedPaper, newPaper: UnifiedPaper): UnifiedPaper {
  return {
    id: existing.source === "semantic_scholar" ? existing.id : newPaper.id,
    title: existing.title || newPaper.title,
    authors: existing.authors.length > 0 ? existing.authors : newPaper.authors,
    journal: existing.journal || newPaper.journal,
    year: existing.year || newPaper.year,
    doi: existing.doi || newPaper.doi,
    pmid: existing.pmid || newPaper.pmid,
    citation_count: Math.max(existing.citation_count, newPaper.citation_count),
    is_open_access: existing.is_open_access || newPaper.is_open_access,
    pdf_url: existing.pdf_url || newPaper.pdf_url,
    abstract:
      existing.abstract &&
      existing.abstract.length > (newPaper.abstract?.length ?? 0)
        ? existing.abstract
        : newPaper.abstract || existing.abstract,
    source: existing.source,
  };
}

export function deduplicatePapers(papers: UnifiedPaper[]): UnifiedPaper[] {
  const seenDois = new Map<string, number>(); // doi -> index in result
  const seenTitles = new Map<string, number>(); // normalized title -> index in result
  const result: UnifiedPaper[] = [];

  for (const paper of papers) {
    // Check DOI-based dedup
    if (paper.doi) {
      const doiLower = paper.doi.toLowerCase();
      if (seenDois.has(doiLower)) {
        const idx = seenDois.get(doiLower)!;
        result[idx] = mergePapers(result[idx], paper);
        continue;
      }
      seenDois.set(doiLower, result.length);
    }

    // Check title-based dedup
    const normTitle = normalizeTitle(paper.title);
    if (normTitle && seenTitles.has(normTitle)) {
      const idx = seenTitles.get(normTitle)!;
      result[idx] = mergePapers(result[idx], paper);
      continue;
    }
    if (normTitle) {
      seenTitles.set(normTitle, result.length);
    }

    result.push(paper);
  }

  const removed = papers.length - result.length;
  if (removed > 0) {
    console.info(
      `Deduplication removed ${removed} papers (${papers.length} -> ${result.length})`,
    );
  }

  return result;
}
