"use client";

import { useState, useCallback, useEffect } from "react";
import type { VocabularyWord } from "@/lib/api";
import {
  QUALITY_REMEMBERED,
  QUALITY_FORGOT,
} from "@/lib/spaced-repetition";
import type { MasteryLevel } from "@/lib/spaced-repetition";
import {
  recordReview,
  getProgress,
} from "@/lib/vocabulary-storage";
import StudySessionSummary, {
  type SessionResult,
} from "./StudySessionSummary";

interface FlashcardViewProps {
  words: VocabularyWord[];
  paperId: string;
  onClose: () => void;
  onComplete?: () => void;
}

export default function FlashcardView({
  words,
  paperId,
  onClose,
  onComplete,
}: FlashcardViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [studyWords, setStudyWords] = useState<VocabularyWord[]>(words);

  // Shuffle on mount
  useEffect(() => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setStudyWords(shuffled);
  }, [words]);

  const currentWord = studyWords[currentIndex];
  const total = studyWords.length;
  const progress = total > 0 ? ((currentIndex) / total) * 100 : 0;

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleAnswer = useCallback(
    (remembered: boolean) => {
      if (!currentWord) return;

      const quality = remembered ? QUALITY_REMEMBERED : QUALITY_FORGOT;

      // Get previous mastery before recording
      const prevProgress = getProgress(currentWord.word);
      const previousMastery: MasteryLevel = prevProgress?.masteryLevel ?? "new";

      // Record review with SM-2
      const updated = recordReview(currentWord.word, quality, paperId);

      // Track result
      const result: SessionResult = {
        word: currentWord.word,
        remembered,
        previousMastery,
        newMastery: updated.masteryLevel,
      };

      const newResults = [...results, result];
      setResults(newResults);

      // Move to next card or complete
      if (currentIndex + 1 >= total) {
        setIsComplete(true);
        onComplete?.();
      } else {
        setIsFlipped(false);
        // Small delay before showing next card for smoother transition
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
        }, 150);
      }
    },
    [currentWord, currentIndex, total, results, paperId, onComplete],
  );

  const handleRetry = useCallback(() => {
    // Retry only words that were incorrect
    const incorrectWords = results
      .filter((r) => !r.remembered)
      .map((r) => studyWords.find((w) => w.word === r.word))
      .filter((w): w is VocabularyWord => w !== undefined);

    if (incorrectWords.length === 0) return;

    const shuffled = [...incorrectWords].sort(() => Math.random() - 0.5);
    setStudyWords(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults([]);
    setIsComplete(false);
  }, [results, studyWords]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isComplete) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!isFlipped) {
          handleFlip();
        }
      } else if (isFlipped) {
        if (e.key === "ArrowRight" || e.key === "o") {
          e.preventDefault();
          handleAnswer(true);
        } else if (e.key === "ArrowLeft" || e.key === "x") {
          e.preventDefault();
          handleAnswer(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFlipped, isComplete, handleFlip, handleAnswer]);

  if (total === 0) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-gray-500">学習する単語がありません</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  // Session complete → show summary
  if (isComplete) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
        <div className="max-w-lg mx-auto py-8">
          {/* Close button */}
          <div className="flex justify-end px-4 mb-4">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="閉じる"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <StudySessionSummary
            results={results}
            onRetry={handleRetry}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="閉じる"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-600">
          {currentIndex + 1} / {total}
        </span>
        <div className="w-6" /> {/* Spacer for centering */}
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-gray-200">
        <div
          className="h-full bg-navy-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm cursor-pointer"
          style={{ perspective: "1200px" }}
          onClick={() => !isFlipped && handleFlip()}
        >
          <div
            className="relative w-full transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              minHeight: "320px",
            }}
          >
            {/* Front Face */}
            <div
              className="absolute inset-0 rounded-2xl bg-white border border-gray-200 shadow-lg p-8 flex flex-col items-center justify-center"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="text-center space-y-4">
                <p className="text-3xl sm:text-4xl font-bold text-gray-900 select-none">
                  {currentWord?.word}
                </p>
                <p className="text-sm text-gray-400">
                  {currentWord?.partOfSpeech}
                </p>
                {currentWord?.pronunciation && (
                  <p className="text-sm text-gray-400 font-mono">
                    /{currentWord.pronunciation}/
                  </p>
                )}
              </div>
              <p className="mt-8 text-xs text-gray-300">タップして答えを見る</p>
            </div>

            {/* Back Face */}
            <div
              className="absolute inset-0 rounded-2xl bg-white border border-gray-200 shadow-lg p-8 flex flex-col items-center justify-center"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div className="text-center space-y-4 w-full">
                <p className="text-lg font-bold text-navy-700">
                  {currentWord?.definition}
                </p>
                <p className="text-sm text-gray-500">
                  {currentWord?.word}
                  <span className="ml-2 text-gray-400">
                    ({currentWord?.partOfSpeech})
                  </span>
                </p>
                {currentWord?.contexts?.[0] && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">論文中の使用例</p>
                    <p className="text-sm text-gray-600 italic leading-relaxed">
                      &ldquo;...{currentWord.contexts[0]}...&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Buttons */}
      <div className="px-4 pb-6 pt-2">
        {isFlipped ? (
          <div className="flex gap-3 max-w-sm mx-auto">
            <button
              onClick={() => handleAnswer(false)}
              className="flex-1 py-4 bg-red-50 text-red-700 rounded-xl font-medium text-lg hover:bg-red-100 active:scale-95 transition-all border border-red-200"
            >
              ✗ まだ
            </button>
            <button
              onClick={() => handleAnswer(true)}
              className="flex-1 py-4 bg-green-50 text-green-700 rounded-xl font-medium text-lg hover:bg-green-100 active:scale-95 transition-all border border-green-200"
            >
              ✓ 覚えた
            </button>
          </div>
        ) : (
          <div className="max-w-sm mx-auto">
            <button
              onClick={handleFlip}
              className="w-full py-4 bg-navy-600 text-white rounded-xl font-medium text-lg hover:bg-navy-700 active:scale-95 transition-all"
            >
              答えを見る
            </button>
          </div>
        )}
        {/* Keyboard hint (desktop only) */}
        <p className="hidden sm:block text-xs text-gray-300 text-center mt-2">
          {isFlipped
            ? "← まだ / → 覚えた"
            : "Space / Enter で答えを表示"}
        </p>
      </div>
    </div>
  );
}
