/**
 * Vocabulary analysis handler.
 * Extracts words from a paper, analyzes them with Claude API in batches,
 * and returns structured vocabulary data.
 */

import type { LLMConfig } from "./llm-client";
import { llmChat } from "./llm-client";
import * as cache from "./cache";
import { extractTextFromUrl } from "./pdf-extractor";
import { fetchPaper } from "./semantic-scholar";
import { extractVocabulary, getTopWords } from "./vocabulary-parser";
import type { VocabularyWord, VocabularyAnalysisResponse } from "./types";

const BATCH_SIZE = 25;
const MAX_WORDS = 200; // Maximum words to analyze
const MAX_PARALLEL_BATCHES = 3; // Parallel Claude API calls

const SYSTEM_PROMPT = `You are a medical English vocabulary expert. Analyze the following English words from a medical research paper. For each word, provide:

1. Japanese definition (concise, natural Japanese)
2. Part of speech (noun/verb/adjective/adverb/preposition/conjunction/other)
3. Difficulty level 1-5:
   - 1: Basic (high school level: "study", "result")
   - 2: Intermediate (TOEIC 600+: "significant", "demonstrate")
   - 3: Advanced academic (TOEIC 800+: "heterogeneous", "confounding")
   - 4: Medical terminology (医学用語: "myocardial", "perfusion")
   - 5: Highly specialized (高度専門: "immunohistochemistry", "pharmacokinetics")
4. Category: "medical" / "academic" / "general"
5. Medical subcategory (if medical): cardiology, neurology, oncology, pharmacology, etc.
6. Pronunciation guide (IPA format, if possible)

Return as a JSON array. No other text.
Format: [{"word":"...","definition":"...","pos":"...","difficulty":N,"category":"...","subcategory":"...","pronunciation":"..."}]`;

interface LLMWordResult {
  word: string;
  definition: string;
  pos: string;
  difficulty: number;
  category: "medical" | "academic" | "general";
  subcategory?: string;
  pronunciation?: string;
}

export interface VocabularyAnalysisOptions {
  /** Pre-fetched abstract text (avoids Semantic Scholar API call) */
  abstract?: string;
  /** Pre-fetched PDF URL (avoids Semantic Scholar API call) */
  pdfUrl?: string;
}

/**
 * Analyze vocabulary for a given paper.
 * Accepts optional pre-fetched data to avoid redundant Semantic Scholar API calls.
 */
export async function handleVocabularyAnalysis(
  paperId: string,
  config?: LLMConfig,
  options?: VocabularyAnalysisOptions,
): Promise<VocabularyAnalysisResponse> {
  // Check cache first
  const cachedData = await cache.getCachedVocabulary(paperId);
  if (cachedData) {
    const parsed = JSON.parse(cachedData) as VocabularyAnalysisResponse;
    return { ...parsed, cached: true };
  }

  // Try to get text: prefer pre-fetched data, fallback to Semantic Scholar
  let text: string = "";
  const hintAbstract = options?.abstract;
  const hintPdfUrl = options?.pdfUrl;

  // 1. Try PDF if URL is provided (from frontend or S2)
  const pdfUrl = hintPdfUrl ?? null;
  if (pdfUrl) {
    try {
      text = await extractTextFromUrl(pdfUrl);
    } catch (err) {
      console.warn(`PDF extraction failed for ${paperId}, falling back to abstract:`, err);
    }
  }

  // 2. Use pre-fetched abstract if available
  if (!text.trim() && hintAbstract) {
    text = hintAbstract;
  }

  // 3. Last resort: fetch from Semantic Scholar
  if (!text.trim()) {
    console.info(`Fetching paper ${paperId} from Semantic Scholar (no pre-fetched data)`);
    const paperData = await fetchPaper(paperId);
    if (!paperData) {
      throw new Error("Paper not found");
    }

    const oaPdf = paperData.openAccessPdf;
    const s2PdfUrl = oaPdf && typeof oaPdf === "object" ? oaPdf.url ?? null : null;

    if (s2PdfUrl && !pdfUrl) {
      try {
        text = await extractTextFromUrl(s2PdfUrl);
      } catch (err) {
        console.warn(`S2 PDF extraction failed for ${paperId}:`, err);
        text = paperData.abstract ?? "";
      }
    } else {
      text = paperData.abstract ?? "";
    }
  }

  if (!text.trim()) {
    throw new Error("No text available for vocabulary analysis");
  }

  // Extract vocabulary
  const { words: wordMap, totalWords } = extractVocabulary(text, true);

  // Get top words by frequency
  const topWords = getTopWords(wordMap, MAX_WORDS, 1);

  if (topWords.length === 0) {
    throw new Error("No vocabulary words could be extracted");
  }

  // Batch analyze with Claude API
  const wordList = topWords.map(([word]) => word);
  const analyzedWords = await batchAnalyzeWords(wordList, config);

  // Merge frequency/context data with LLM analysis
  const vocabularyWords: VocabularyWord[] = [];

  for (const analyzed of analyzedWords) {
    const wordInfo = wordMap.get(analyzed.word);
    if (!wordInfo) continue;

    vocabularyWords.push({
      word: analyzed.word,
      definition: analyzed.definition,
      partOfSpeech: analyzed.pos,
      difficulty: Math.min(5, Math.max(1, analyzed.difficulty)),
      category: analyzed.category,
      subcategory: analyzed.subcategory,
      frequency: wordInfo.frequency,
      contexts: wordInfo.contexts,
      pronunciation: analyzed.pronunciation,
    });
  }

  // Sort by difficulty (descending), then frequency (descending)
  vocabularyWords.sort((a, b) => {
    if (b.difficulty !== a.difficulty) return b.difficulty - a.difficulty;
    return b.frequency - a.frequency;
  });

  // Build summary
  const summary = {
    medical: vocabularyWords.filter((w) => w.category === "medical").length,
    academic: vocabularyWords.filter((w) => w.category === "academic").length,
    general: vocabularyWords.filter((w) => w.category === "general").length,
    difficulty_distribution: {} as Record<string, number>,
  };

  for (let level = 1; level <= 5; level++) {
    summary.difficulty_distribution[String(level)] = vocabularyWords.filter(
      (w) => w.difficulty === level,
    ).length;
  }

  const response: VocabularyAnalysisResponse = {
    paper_id: paperId,
    total_words: totalWords,
    unique_words: vocabularyWords.length,
    words: vocabularyWords,
    summary,
    cached: false,
  };

  // Cache the result
  await cache.setCachedVocabulary(paperId, JSON.stringify(response));

  return response;
}

/**
 * Analyze a single batch of words using Claude API.
 */
async function analyzeSingleBatch(
  batch: string[],
  batchIndex: number,
  totalBatches: number,
  config?: LLMConfig,
): Promise<LLMWordResult[]> {
  const results: LLMWordResult[] = [];
  try {
    const userMessage = `Words: ${JSON.stringify(batch)}`;
    const responseText = await llmChat(
      SYSTEM_PROMPT,
      userMessage,
      { expectJson: true, maxTokens: 4096 },
      config,
    );

    const parsed = JSON.parse(responseText) as LLMWordResult[];
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item.word && item.definition && item.pos && item.difficulty && item.category) {
          const validCategories = ["medical", "academic", "general"];
          if (!validCategories.includes(item.category)) {
            item.category = "general";
          }
          results.push(item);
        }
      }
    }

    console.info(`Batch ${batchIndex + 1}/${totalBatches}: analyzed ${parsed.length} words`);
  } catch (err) {
    console.error(`Batch ${batchIndex + 1}/${totalBatches} failed:`, err);
  }
  return results;
}

/**
 * Analyze words in batches using Claude API.
 * Runs batches in parallel (up to MAX_PARALLEL_BATCHES at a time).
 * Continues even if individual batches fail.
 */
async function batchAnalyzeWords(
  words: string[],
  config?: LLMConfig,
): Promise<LLMWordResult[]> {
  const batches: string[][] = [];

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    batches.push(words.slice(i, i + BATCH_SIZE));
  }

  console.info(`Vocabulary analysis: ${words.length} words in ${batches.length} batches (parallel=${MAX_PARALLEL_BATCHES})`);

  const allResults: LLMWordResult[] = [];

  // Process batches in parallel chunks
  for (let i = 0; i < batches.length; i += MAX_PARALLEL_BATCHES) {
    const chunk = batches.slice(i, i + MAX_PARALLEL_BATCHES);
    const promises = chunk.map((batch, j) =>
      analyzeSingleBatch(batch, i + j, batches.length, config),
    );

    const chunkResults = await Promise.all(promises);
    for (const results of chunkResults) {
      allResults.push(...results);
    }
  }

  return allResults;
}
