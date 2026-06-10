/**
 * PDF text extraction and section splitting for academic papers.
 *
 * Note: In the Python version, pypdf was used for PDF parsing.
 * In this TypeScript/Vercel version, we use pdf-parse (or raw text extraction).
 * Since pdf-parse is a heavy dependency, we'll do a simpler approach:
 * fetch the PDF as arraybuffer and use a lightweight parser.
 *
 * For Vercel deployment, we avoid native dependencies.
 * We use the pdf.js-based extraction via dynamic import.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 MB
const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 3;

// Common section headers in academic papers
const SECTION_PATTERNS: RegExp[] = [
  /^(abstract)\s*$/i,
  /^(introduction)\s*$/i,
  /^(background)\s*$/i,
  /^(methods?|materials?\s+and\s+methods?|experimental\s+methods?)\s*$/i,
  /^(results?)\s*$/i,
  /^(results?\s+and\s+discussion)\s*$/i,
  /^(discussion)\s*$/i,
  /^(conclusion|conclusions|concluding\s+remarks?)\s*$/i,
  /^(limitations?)\s*$/i,
  /^(acknowledgements?|acknowledgments?)\s*$/i,
  /^(references|bibliography)\s*$/i,
  /^(supplementary|supporting\s+information)\s*/i,
  // Numbered sections
  /^(?:\d+\.?\s+|[IVX]+\.?\s+)(introduction|background|methods?|materials?\s+and\s+methods?|results?|discussion|conclusion|conclusions|limitations?|acknowledgements?|references)/i,
];

// Sections to exclude from translation
const EXCLUDE_SECTIONS = new Set([
  "references",
  "bibliography",
  "acknowledgements",
  "acknowledgments",
  "supplementary",
  "supporting information",
]);

export async function extractTextFromUrl(pdfUrl: string): Promise<string> {
  let pdfBuffer: ArrayBuffer;

  try {
    const resp = await fetchPdfSafely(pdfUrl);

    if (!resp.ok) {
      throw new Error(`PDF download failed: HTTP ${resp.status}`);
    }

    const contentType = resp.headers.get("content-type")?.toLowerCase() ?? "";
    if (
      contentType &&
      !contentType.includes("application/pdf") &&
      !contentType.includes("application/octet-stream") &&
      !contentType.includes("binary/octet-stream")
    ) {
      throw new Error(`Unexpected PDF content type: ${contentType}`);
    }

    pdfBuffer = await readLimitedArrayBuffer(resp);
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error("PDF download timed out");
    }
    throw err instanceof Error
      ? err
      : new Error(`PDF download failed: ${err}`);
  }

  // Extract text using pdf-parse (lazy import)
  try {
    // Dynamic import to avoid bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (
      buffer: Buffer,
    ) => Promise<{ text: string; numpages: number }>;

    const buffer = Buffer.from(pdfBuffer);
    const result = await pdfParse(buffer);

    const fullText = result.text;
    if (!fullText.trim()) {
      throw new Error(
        "No text could be extracted from the PDF (may be image-based)",
      );
    }

    console.info(
      `Extracted ${fullText.length} characters from ${result.numpages} pages`,
    );
    return fullText;
  } catch (err) {
    if (err instanceof Error && err.message.includes("No text")) {
      throw err;
    }
    throw new Error(`PDF text extraction failed: ${err}`);
  }
}

async function fetchPdfSafely(
  rawUrl: string,
  redirectCount: number = 0,
): Promise<Response> {
  const url = await validatePublicHttpUrl(rawUrl);
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/pdf,*/*",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });

  if (isRedirect(resp.status)) {
    if (redirectCount >= MAX_REDIRECTS) {
      throw new Error("PDF download redirected too many times");
    }

    const location = resp.headers.get("location");
    if (!location) {
      throw new Error("PDF download redirect missing Location header");
    }

    return fetchPdfSafely(new URL(location, url).toString(), redirectCount + 1);
  }

  return resp;
}

async function validatePublicHttpUrl(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid PDF URL");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("PDF URL must use http or https");
  }

  if (url.username || url.password) {
    throw new Error("PDF URL must not contain credentials");
  }

  await assertPublicHostname(url.hostname);
  return url.toString();
}

async function assertPublicHostname(hostname: string): Promise<void> {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".local")) {
    throw new Error("PDF URL hostname is not allowed");
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new Error("PDF URL hostname could not be resolved");
  }

  if (records.some((record) => isBlockedAddress(record.address))) {
    throw new Error("PDF URL resolves to a private or reserved address");
  }
}

function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isBlockedIPv4(address);
  if (version === 6) return isBlockedIPv6(address);
  return true;
}

function isBlockedIPv4(address: string): boolean {
  const [a, b, c] = address.split(".").map((part) => Number(part));
  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c)) {
    return true;
  }

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isBlockedIPv6(address: string): boolean {
  const value = address.toLowerCase();
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("::ffff:")) {
    return isBlockedIPv4(value.replace("::ffff:", ""));
  }

  const first = Number.parseInt(value.split(":")[0], 16);
  if (!Number.isFinite(first)) return true;

  return (
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xff00) === 0xff00 ||
    value.startsWith("2001:db8:")
  );
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

async function readLimitedArrayBuffer(resp: Response): Promise<ArrayBuffer> {
  const contentLength = Number(resp.headers.get("content-length") ?? "0");
  if (contentLength > MAX_PDF_SIZE) {
    throw new Error(
      `PDF too large: ${(contentLength / 1024 / 1024).toFixed(1)} MB (max ${MAX_PDF_SIZE / 1024 / 1024} MB)`,
    );
  }

  if (!resp.body) {
    const buffer = await resp.arrayBuffer();
    if (buffer.byteLength > MAX_PDF_SIZE) {
      throw new Error(
        `PDF too large: ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB (max ${MAX_PDF_SIZE / 1024 / 1024} MB)`,
      );
    }
    return buffer;
  }

  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    received += value.byteLength;
    if (received > MAX_PDF_SIZE) {
      await reader.cancel();
      throw new Error(
        `PDF too large: ${(received / 1024 / 1024).toFixed(1)} MB (max ${MAX_PDF_SIZE / 1024 / 1024} MB)`,
      );
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged.buffer;
}

export function splitIntoSections(
  text: string,
): Array<{ name: string; text: string }> {
  const lines = text.split("\n");
  const sections: Array<{ name: string; text: string }> = [];
  let currentName = "Full Text";
  let currentLines: string[] = [];

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) {
      currentLines.push("");
      continue;
    }

    // Check if this line is a section header
    const matchedSection = matchSectionHeader(stripped);
    if (matchedSection) {
      // Save previous section
      if (currentLines.length > 0) {
        const sectionText = currentLines.join("\n").trim();
        if (sectionText) {
          sections.push({ name: currentName, text: sectionText });
        }
      }
      currentName = matchedSection;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Save last section
  if (currentLines.length > 0) {
    const sectionText = currentLines.join("\n").trim();
    if (sectionText) {
      sections.push({ name: currentName, text: sectionText });
    }
  }

  // If no sections were detected (only "Full Text"), return as-is
  if (sections.length <= 1) {
    return [{ name: "Full Text", text: text.trim() }];
  }

  // Filter out unwanted sections
  const filtered = sections.filter((s) => {
    const nameLower = s.name.toLowerCase();
    if (EXCLUDE_SECTIONS.has(nameLower)) return false;
    if (s.text.length < 50) return false;
    return true;
  });

  return filtered.length > 0
    ? filtered
    : [{ name: "Full Text", text: text.trim() }];
}

function matchSectionHeader(line: string): string | null {
  for (const pattern of SECTION_PATTERNS) {
    const m = pattern.exec(line);
    if (m) {
      const rawName = m[1] ?? line;
      return normalizeSectionName(rawName);
    }
  }
  return null;
}

function normalizeSectionName(name: string): string {
  const nameLower = name.toLowerCase().trim();

  const mapping: Record<string, string> = {
    abstract: "Abstract",
    introduction: "Introduction",
    background: "Background",
    method: "Methods",
    methods: "Methods",
    "materials and methods": "Methods",
    "materials & methods": "Methods",
    "experimental methods": "Methods",
    result: "Results",
    results: "Results",
    "results and discussion": "Results and Discussion",
    discussion: "Discussion",
    conclusion: "Conclusion",
    conclusions: "Conclusion",
    "concluding remarks": "Conclusion",
    limitation: "Limitations",
    limitations: "Limitations",
    acknowledgement: "Acknowledgements",
    acknowledgements: "Acknowledgements",
    acknowledgment: "Acknowledgements",
    acknowledgments: "Acknowledgements",
    references: "References",
    bibliography: "References",
    supplementary: "Supplementary",
    "supporting information": "Supplementary",
  };

  return (
    mapping[nameLower] ??
    name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  );
}
