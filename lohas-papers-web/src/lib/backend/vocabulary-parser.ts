/**
 * Text tokenizer and vocabulary extractor for academic papers.
 * Extracts English words, counts frequency, and captures context sentences.
 */

import { STOP_WORDS } from "./stop-words";

/**
 * Split text into sentences (simple heuristic).
 */
function splitSentences(text: string): string[] {
  // Split on period/question mark/exclamation followed by space and uppercase letter
  // Also handle newlines as potential sentence boundaries
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

/**
 * Tokenize text into lowercase English words.
 * Only extracts words that are 2+ characters, ASCII letters only.
 */
export function tokenizeText(text: string): string[] {
  // Match sequences of ASCII letters (2+ characters)
  const matches = text.match(/[a-zA-Z]{2,}/g);
  if (!matches) return [];
  return matches.map((w) => w.toLowerCase());
}

export interface WordInfo {
  frequency: number;
  contexts: string[];
}

export interface VocabularyExtractionResult {
  words: Map<string, WordInfo>;
  totalWords: number;
}

/**
 * Extract vocabulary from text with frequency counting and context capture.
 *
 * @param text - Full text to analyze
 * @param filterStopWords - Whether to remove stop words (default: true)
 * @returns Map of words with frequency and context sentences
 */
export function extractVocabulary(
  text: string,
  filterStopWords: boolean = true,
): VocabularyExtractionResult {
  const tokens = tokenizeText(text);
  const totalWords = tokens.length;

  // Build frequency map
  const wordFreq = new Map<string, number>();
  for (const token of tokens) {
    if (filterStopWords && STOP_WORDS.has(token)) continue;
    wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
  }

  // Extract sentences for context lookup
  const sentences = splitSentences(text);

  // Build word -> contexts map (max 3 contexts per word)
  const words = new Map<string, WordInfo>();

  for (const [word, frequency] of wordFreq.entries()) {
    // Skip very short or very common words that slipped through
    if (word.length < 3) continue;

    // Find context sentences containing this word
    const contexts: string[] = [];
    const wordRegex = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
    for (const sentence of sentences) {
      if (contexts.length >= 3) break;
      if (wordRegex.test(sentence)) {
        // Truncate very long sentences
        const ctx = sentence.length > 300
          ? sentence.slice(0, 297) + "..."
          : sentence;
        contexts.push(ctx);
      }
    }

    words.set(word, { frequency, contexts });
  }

  return { words, totalWords };
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Get top N words by frequency, optionally filtering by minimum frequency.
 */
export function getTopWords(
  words: Map<string, WordInfo>,
  limit: number = 200,
  minFrequency: number = 1,
): Array<[string, WordInfo]> {
  return Array.from(words.entries())
    .filter(([, info]) => info.frequency >= minFrequency)
    .sort((a, b) => b[1].frequency - a[1].frequency)
    .slice(0, limit);
}
