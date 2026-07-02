import type { UnifiedPaper } from "./types";

const ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
const TIMEOUT_MS = 10_000;
const TOOL_NAME = "lohas-papers";

let nextPubMedRequestAt = 0;

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
  const pubmedEmail = process.env.PUBMED_EMAIL || "";

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
    tool: TOOL_NAME,
  });
  if (pubmedApiKey) searchParams.set("api_key", pubmedApiKey);
  if (pubmedEmail) searchParams.set("email", pubmedEmail);

  // Step 1: ESearch to get PMIDs
  const searchResp = await fetchPubMedWithRetries(
    `${ESEARCH_URL}?${searchParams}`,
    query,
    "PubMed ESearch",
    Boolean(pubmedApiKey),
  );
  if (!searchResp) return [];

  const searchData = await searchResp.json();
  const idList: string[] = searchData?.esearchresult?.idlist ?? [];
  if (idList.length === 0) return [];

  // Step 2: EFetch to get full records
  const fetchParams = new URLSearchParams({
    db: "pubmed",
    id: idList.join(","),
    retmode: "xml",
    tool: TOOL_NAME,
  });
  if (pubmedApiKey) fetchParams.set("api_key", pubmedApiKey);
  if (pubmedEmail) fetchParams.set("email", pubmedEmail);

  const fetchResp = await fetchPubMedWithRetries(
    `${EFETCH_URL}?${fetchParams}`,
    query,
    "PubMed EFetch",
    Boolean(pubmedApiKey),
  );
  if (!fetchResp) return [];

  const xmlText = await fetchResp.text();
  if (!xmlText) {
    return [];
  }

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

async function fetchPubMedWithRetries(
  url: string,
  query: string,
  label: string,
  hasApiKey: boolean,
): Promise<Response | null> {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await waitForPubMedSlot(hasApiKey);
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (resp.ok) return resp;

      if (resp.status === 429 && attempt < maxRetries - 1) {
        const waitMs = getRetryDelayMs(resp.headers.get("retry-after"), attempt);
        console.info(
          `${label} 429, retrying in ${Math.round(waitMs / 1000)}s: ${query}`,
        );
        await sleep(waitMs);
        continue;
      }

      console.warn(`${label} HTTP error ${resp.status}: ${query}`);
      return null;
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        console.warn(`${label} timeout for query: ${query}`);
        return null;
      }
      console.error(`${label} unexpected error for query: ${query}`, err);
      return null;
    }
  }

  return null;
}

async function waitForPubMedSlot(hasApiKey: boolean): Promise<void> {
  const minIntervalMs = hasApiKey ? 120 : 450;
  const now = Date.now();
  const waitMs = Math.max(0, nextPubMedRequestAt - now);
  nextPubMedRequestAt = Math.max(now, nextPubMedRequestAt) + minIntervalMs;
  if (waitMs > 0) {
    await sleep(waitMs);
  }
}

function getRetryDelayMs(retryAfter: string | null, attempt: number): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.max(1000, retryAt - Date.now());
    }
  }

  return (attempt + 2) * 1500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
