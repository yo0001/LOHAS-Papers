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

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 MB
const DOWNLOAD_TIMEOUT_MS = 30_000;

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
    const resp = await fetch(pdfUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/pdf,*/*",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });

    if (!resp.ok) {
      throw new Error(`PDF download failed: HTTP ${resp.status}`);
    }

    pdfBuffer = await resp.arrayBuffer();

    if (pdfBuffer.byteLength > MAX_PDF_SIZE) {
      throw new Error(
        `PDF too large: ${(pdfBuffer.byteLength / 1024 / 1024).toFixed(1)} MB (max ${MAX_PDF_SIZE / 1024 / 1024} MB)`,
      );
    }
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
