/**
 * SM-2 Spaced Repetition Algorithm
 * Based on SuperMemo SM-2 (same logic as Distill's SpacedRepetitionService.swift)
 */

export type MasteryLevel = "new" | "learning" | "reviewing" | "mastered";

export interface SM2State {
  easeFactor: number;
  intervalDays: number;
  repetitionNumber: number;
  nextReviewDate: string; // ISO date string
  masteryLevel: MasteryLevel;
}

export interface SM2Input {
  easeFactor: number;
  intervalDays: number;
  repetitionNumber: number;
}

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

/**
 * Calculate next review state using SM-2 algorithm.
 *
 * @param current - Current SM-2 state of the word
 * @param qualityRating - Quality of recall: 0-5 (0=complete blackout, 5=perfect recall)
 *   For flashcards: "覚えた" → 4, "まだ" → 1
 * @returns Updated SM-2 state
 */
export function calculateNextReview(
  current: SM2Input,
  qualityRating: number,
): SM2State {
  const q = Math.max(0, Math.min(5, Math.round(qualityRating)));
  let { easeFactor, intervalDays, repetitionNumber } = current;

  if (q < 3) {
    // Failed: reset repetition
    repetitionNumber = 0;
    intervalDays = 1;
  } else {
    // Passed: advance repetition
    repetitionNumber += 1;
    if (repetitionNumber === 1) {
      intervalDays = 1;
    } else if (repetitionNumber === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  }

  // Update ease factor
  easeFactor =
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < MIN_EASE_FACTOR) {
    easeFactor = MIN_EASE_FACTOR;
  }

  // Calculate next review date
  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + intervalDays);

  // Determine mastery level
  const masteryLevel = getMasteryLevel(repetitionNumber, intervalDays);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    intervalDays,
    repetitionNumber,
    nextReviewDate: nextReview.toISOString(),
    masteryLevel,
  };
}

/**
 * Determine mastery level based on repetition state
 */
export function getMasteryLevel(
  repetitionNumber: number,
  intervalDays: number,
): MasteryLevel {
  if (repetitionNumber === 0) return "new";
  if (repetitionNumber <= 2) return "learning";
  if (intervalDays >= 21) return "mastered";
  return "reviewing";
}

/**
 * Get default SM-2 state for a new word
 */
export function getDefaultSM2State(): SM2Input {
  return {
    easeFactor: DEFAULT_EASE_FACTOR,
    intervalDays: 0,
    repetitionNumber: 0,
  };
}

/**
 * Check if a word is due for review
 */
export function isDueForReview(nextReviewDate: string): boolean {
  return new Date(nextReviewDate) <= new Date();
}

/**
 * Quality rating helpers for flashcard UI
 */
export const QUALITY_REMEMBERED = 4; // "覚えた ✓"
export const QUALITY_FORGOT = 1; // "まだ ✗"
