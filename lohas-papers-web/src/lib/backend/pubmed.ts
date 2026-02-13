import type { UnifiedPaper } from "./types";

const ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
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
  const pubmedApiKey = process.env.PUBMED_API_KEY || "";

  // Add date filter to query if specified
  let dateFilter = "";
  if (yearFrom) dateFilter += ` AND ${yearFrom}[PDAT]`;
  if (yearTo) dateFilter += ` AND ${yearTo}[PDAT]`;

  const searchParams = new URLSearchParams({
    db: "pubmed",
    term: query + dateFilter,
    retmax: String(limit),
    sort: "relevance",
    retmode: "json",
  });
  if (pubmedApiKey) searchParams.set("api_key", pubmedApiKey);

  let xmlText: string | null = null;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Step 1: ESearch to get PMIDs
      const searchResp = await fetch(`${ESEARCH_URL}?${searchParams}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!searchResp.ok) {
        if (searchResp.status === 429 && attempt < maxRetries - 1) {
          const wait = 2 ** attempt + 1;
          console.info(`PubMed 429, retrying in ${wait}s: ${query}`);
          await sleep(wait * 1000);
          continue;
        }
        console.warn(`PubMed HTTP error ${searchResp.status}: ${query}`);
        return [];
      }

      const searchData = await searchResp.json();
      const idList: string[] = searchData?.esearchresult?.idlist ?? [];
      if (idList.length === 0) return [];

      // Step 2: EFetch to get full records
      const fetchParams = new URLSearchParams({
        db: "pubmed",
        id: idList.join(","),
        retmode: "xml",
      });
      if (pubmedApiKey) fetchParams.set("api_key", pubmedApiKey);

      const fetchResp = await fetch(`${EFETCH_URL}?${fetchParams}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!fetchResp.ok) {
        console.warn(`PubMed EFetch HTTP error ${fetchResp.status}: ${query}`);
        return [];
      }

      xmlText = await fetchResp.text();
      break;
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        console.warn(`PubMed timeout for query: ${query}`);
        return [];
      }
      console.error(`PubMed unexpected error for query: ${query}`, err);
      return [];
    }
  }

  if (!xmlText) return [];
  return parsePubmedXml(xmlText);
}

// ── XML Parsing (lightweight, no external dependency) ──

function parsePubmedXml(xmlText: string): UnifiedPaper[] {
  const papers: UnifiedPaper[] = [];

  // Split on PubmedArticle tags
  const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let match: RegExpExecArray | null;

  while ((match = articleRegex.exec(xmlText)) !== null) {
    try {
      const paper = parseSingleArticle(match[1]);
      if (paper) papers.push(paper);
    } catch {
      console.warn("Failed to parse PubMed article");
    }
  }

  console.info(`PubMed returned ${papers.length} papers`);
  return papers;
}

function parseSingleArticle(articleXml: string): UnifiedPaper | null {
  // PMID
  const pmid = extractTag(articleXml, "PMID");
  if (!pmid) return null;

  // Title
  const title = extractTag(articleXml, "ArticleTitle") || "";

  // Abstract
  const abstractParts: string[] = [];
  const abstractTextRegex =
    /<AbstractText(?:\s+Label="([^"]*)")?[^>]*>([\s\S]*?)<\/AbstractText>/g;
  let absMatch: RegExpExecArray | null;
  while ((absMatch = abstractTextRegex.exec(articleXml)) !== null) {
    const label = absMatch[1] || "";
    const text = stripTags(absMatch[2] || "");
    abstractParts.push(label ? `${label}: ${text}` : text);
  }
  const abstract = abstractParts.length > 0 ? abstractParts.join(" ") : undefined;

  // Authors
  const authors: string[] = [];
  const authorRegex = /<Author[^>]*>([\s\S]*?)<\/Author>/g;
  let authorMatch: RegExpExecArray | null;
  while ((authorMatch = authorRegex.exec(articleXml)) !== null) {
    const last = extractTag(authorMatch[1], "LastName") || "";
    const first = extractTag(authorMatch[1], "ForeName") || "";
    if (last) authors.push(`${first} ${last}`.trim());
  }

  // Journal
  const journal = extractTag(articleXml, "Title");

  // Year
  let year: number | undefined;
  const yearMatch = /<PubDate>([\s\S]*?)<\/PubDate>/.exec(articleXml);
  if (yearMatch) {
    const yearStr = extractTag(yearMatch[1], "Year");
    if (yearStr) {
      const parsed = parseInt(yearStr, 10);
      if (!isNaN(parsed)) year = parsed;
    }
  }

  // DOI
  let doi: string | undefined;
  const doiRegex = /<ELocationID\s+EIdType="doi"[^>]*>([\s\S]*?)<\/ELocationID>/;
  const doiMatch = doiRegex.exec(articleXml);
  if (doiMatch) doi = stripTags(doiMatch[1]).trim();

  return {
    id: `pmid:${pmid}`,
    title,
    authors,
    journal: journal || null,
    year: year ?? null,
    doi: doi || null,
    pmid,
    citation_count: 0, // PubMed doesn't provide citation counts directly
    is_open_access: false, // Would need PMC check
    pdf_url: null,
    abstract: abstract || null,
    source: "pubmed",
  };
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const match = regex.exec(xml);
  return match ? stripTags(match[1]).trim() : null;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
