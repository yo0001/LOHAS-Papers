/**
 * Vocabulary learning progress storage (localStorage)
 * Phase 2: localStorage-based. Phase 3 will migrate to Supabase.
 */

import {
  calculateNextReview,
  getDefaultSM2State,
  getMasteryLevel,
  isDueForReview,
  type MasteryLevel,
  type SM2Input,
} from "./spaced-repetition";

// ── Types ──

export interface WordProgress {
  paperId: string; // 最初に出会った論文
  isKnown: boolean; // 知ってる/知らない
  masteryLevel: MasteryLevel;
  easeFactor: number;
  intervalDays: number;
  repetitionNumber: number;
  nextReviewDate: string; // ISO date
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt: string;
  createdAt: string;
}

export interface UserVocabularyProgress {
  [word: string]: WordProgress;
}

export interface VocabularyStats {
  totalWords: number;
  knownWords: number;
  unknownWords: number;
  masteryBreakdown: Record<MasteryLevel, number>;
  dueForReview: number;
  totalCorrect: number;
  totalIncorrect: number;
}

// ── Storage Keys ──

const PROGRESS_KEY = "vocab-progress";

function getKnownKey(paperId: string): string {
  return `vocab-known-${paperId}`;
}

// ── CRUD Functions ──

/**
 * Get all progress data
 */
export function getAllProgress(): UserVocabularyProgress {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save all progress data
 */
function saveAllProgress(progress: UserVocabularyProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * Get progress for a single word
 */
export function getProgress(word: string): WordProgress | null {
  const all = getAllProgress();
  return all[word.toLowerCase()] ?? null;
}

/**
 * Update progress for a word
 */
export function updateProgress(
  word: string,
  data: Partial<WordProgress>,
): WordProgress {
  const all = getAllProgress();
  const key = word.toLowerCase();
  const existing = all[key];
  const now = new Date().toISOString();

  const updated: WordProgress = {
    paperId: existing?.paperId ?? data.paperId ?? "",
    isKnown: data.isKnown ?? existing?.isKnown ?? false,
    masteryLevel: data.masteryLevel ?? existing?.masteryLevel ?? "new",
    easeFactor: data.easeFactor ?? existing?.easeFactor ?? 2.5,
    intervalDays: data.intervalDays ?? existing?.intervalDays ?? 0,
    repetitionNumber: data.repetitionNumber ?? existing?.repetitionNumber ?? 0,
    nextReviewDate: data.nextReviewDate ?? existing?.nextReviewDate ?? now,
    correctCount: data.correctCount ?? existing?.correctCount ?? 0,
    incorrectCount: data.incorrectCount ?? existing?.incorrectCount ?? 0,
    lastReviewedAt: data.lastReviewedAt ?? existing?.lastReviewedAt ?? now,
    createdAt: existing?.createdAt ?? now,
  };

  all[key] = updated;
  saveAllProgress(all);
  return updated;
}

/**
 * Record a flashcard review result using SM-2
 */
export function recordReview(
  word: string,
  qualityRating: number,
  paperId?: string,
): WordProgress {
  const existing = getProgress(word);
  const sm2Input: SM2Input = existing
    ? {
        easeFactor: existing.easeFactor,
        intervalDays: existing.intervalDays,
        repetitionNumber: existing.repetitionNumber,
      }
    : getDefaultSM2State();

  const result = calculateNextReview(sm2Input, qualityRating);
  const isCorrect = qualityRating >= 3;

  return updateProgress(word, {
    paperId: paperId ?? existing?.paperId ?? "",
    masteryLevel: result.masteryLevel,
    easeFactor: result.easeFactor,
    intervalDays: result.intervalDays,
    repetitionNumber: result.repetitionNumber,
    nextReviewDate: result.nextReviewDate,
    correctCount: (existing?.correctCount ?? 0) + (isCorrect ? 1 : 0),
    incorrectCount: (existing?.incorrectCount ?? 0) + (isCorrect ? 0 : 1),
    lastReviewedAt: new Date().toISOString(),
  });
}

/**
 * Get all words due for review
 */
export function getAllDueWords(): Array<{ word: string; progress: WordProgress }> {
  const all = getAllProgress();
  return Object.entries(all)
    .filter(
      ([, p]) =>
        !p.isKnown && isDueForReview(p.nextReviewDate),
    )
    .map(([word, progress]) => ({ word, progress }))
    .sort(
      (a, b) =>
        new Date(a.progress.nextReviewDate).getTime() -
        new Date(b.progress.nextReviewDate).getTime(),
    );
}

/**
 * Get vocabulary statistics
 */
export function getStats(): VocabularyStats {
  const all = getAllProgress();
  const entries = Object.values(all);

  const masteryBreakdown: Record<MasteryLevel, number> = {
    new: 0,
    learning: 0,
    reviewing: 0,
    mastered: 0,
  };

  let knownWords = 0;
  let unknownWords = 0;
  let dueForReview = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;

  for (const p of entries) {
    if (p.isKnown) {
      knownWords++;
    } else {
      unknownWords++;
    }
    masteryBreakdown[p.masteryLevel]++;
    if (!p.isKnown && isDueForReview(p.nextReviewDate)) {
      dueForReview++;
    }
    totalCorrect += p.correctCount;
    totalIncorrect += p.incorrectCount;
  }

  return {
    totalWords: entries.length,
    knownWords,
    unknownWords,
    masteryBreakdown,
    dueForReview,
    totalCorrect,
    totalIncorrect,
  };
}

// ── Paper-level known/unknown (legacy compatible, also syncs to global) ──

/**
 * Get known word map for a paper (paper-level)
 */
export function getPaperKnownMap(paperId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getKnownKey(paperId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Set known/unknown status for a word in a paper
 * Also syncs to global progress
 */
export function setPaperWordKnown(
  paperId: string,
  word: string,
  isKnown: boolean,
): void {
  // Save paper-level
  const map = getPaperKnownMap(paperId);
  map[word.toLowerCase()] = isKnown;
  if (typeof window !== "undefined") {
    localStorage.setItem(getKnownKey(paperId), JSON.stringify(map));
  }

  // Sync to global progress
  updateProgress(word, { paperId, isKnown });
}

/**
 * Get count of unknown words for a paper
 */
export function getUnknownCount(paperId: string): number {
  const map = getPaperKnownMap(paperId);
  return Object.values(map).filter((v) => v === false).length;
}

/**
 * Mark a word as known in global progress (e.g., after mastering in flashcards)
 */
export function markWordAsKnown(word: string): void {
  updateProgress(word, { isKnown: true });
}
