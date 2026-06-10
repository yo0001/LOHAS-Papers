"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import type { MasteryLevel } from "@/lib/spaced-repetition";
import {
  getAllWords,
  getDueWords,
  getMasteryStats,
  deleteWord,
  clearAll,
  type WordProgress,
} from "@/lib/vocabulary-storage";
import {
  QUALITY_REMEMBERED,
  QUALITY_FORGOT,
} from "@/lib/spaced-repetition";
import {
  recordReview,
  getProgress,
} from "@/lib/vocabulary-storage";
import StudySessionSummary, {
  type SessionResult,
} from "@/components/StudySessionSummary";

// ── Types ──

type WordWithKey = { word: string } & WordProgress;

type MasteryFilter = "all" | MasteryLevel;

// ── Constants ──

const MASTERY_LABELS: Record<MasteryLevel, string> = {
  new: "新規",
  learning: "学習中",
  reviewing: "復習中",
  mastered: "習得済み",
};

const MASTERY_COLORS: Record<MasteryLevel, string> = {
  new: "bg-gray-100 text-gray-600",
  learning: "bg-orange-100 text-orange-700",
  reviewing: "bg-blue-100 text-blue-700",
  mastered: "bg-green-100 text-green-700",
};

const MASTERY_DOT_COLORS: Record<MasteryLevel, string> = {
  new: "bg-gray-400",
  learning: "bg-orange-400",
  reviewing: "bg-blue-400",
  mastered: "bg-green-500",
};

const MASTERY_CHART_COLORS: Record<MasteryLevel, string> = {
  new: "#9ca3af",
  learning: "#f97316",
  reviewing: "#3b82f6",
  mastered: "#22c55e",
};

// ── Helper Components ──

function MasteryBadge({ level }: { level: MasteryLevel }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${MASTERY_COLORS[level]}`}
    >
      {MASTERY_LABELS[level]}
    </span>
  );
}

function MasteryDonutChart({
  stats,
}: {
  stats: { new: number; learning: number; reviewing: number; mastered: number; total: number };
}) {
  if (stats.total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        まだ単語がありません
      </div>
    );
  }

  const levels: MasteryLevel[] = ["new", "learning", "reviewing", "mastered"];
  let cumulativePercent = 0;

  // Build conic-gradient segments
  const segments = levels
    .map((level) => {
      const pct = (stats[level] / stats.total) * 100;
      if (pct === 0) return null;
      const start = cumulativePercent;
      cumulativePercent += pct;
      return `${MASTERY_CHART_COLORS[level]} ${start}% ${cumulativePercent}%`;
    })
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <div className="relative w-32 h-32 shrink-0">
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `conic-gradient(${segments})`,
          }}
        />
        <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          <span className="text-xs text-gray-500">単語</span>
        </div>
      </div>
      {/* Legend */}
      <div className="space-y-2">
        {levels.map((level) => (
          <div key={level} className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${MASTERY_DOT_COLORS[level]}`}
            />
            <span className="text-sm text-gray-700">{MASTERY_LABELS[level]}</span>
            <span className="text-sm font-semibold text-gray-900">{stats[level]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "今日";
  if (days === 1) return "昨日";
  if (days < 7) return `${days}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

function formatNextReview(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) return "今すぐ";
  if (days === 1) return "明日";
  if (days < 7) return `${days}日後`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

function getAccuracy(correct: number, incorrect: number): string {
  const total = correct + incorrect;
  if (total === 0) return "—";
  return `${Math.round((correct / total) * 100)}%`;
}

// ── Flashcard Review Modal (inline, for due words) ──

interface ReviewFlashcardProps {
  dueWords: WordWithKey[];
  onClose: () => void;
  onComplete: () => void;
}

function ReviewFlashcard({ dueWords, onClose, onComplete }: ReviewFlashcardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [studyWords, setStudyWords] = useState<WordWithKey[]>(() =>
    [...dueWords].sort(() => Math.random() - 0.5),
  );

  const currentWord = studyWords[currentIndex];
  const total = studyWords.length;
  const progress = total > 0 ? (currentIndex / total) * 100 : 0;

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleAnswer = useCallback(
    (remembered: boolean) => {
      if (!currentWord) return;
      const quality = remembered ? QUALITY_REMEMBERED : QUALITY_FORGOT;
      const prevProgress = getProgress(currentWord.word);
      const previousMastery: MasteryLevel = prevProgress?.masteryLevel ?? "new";
      const updated = recordReview(currentWord.word, quality, currentWord.paperId);
      const result: SessionResult = {
        word: currentWord.word,
        remembered,
        previousMastery,
        newMastery: updated.masteryLevel,
      };
      const newResults = [...results, result];
      setResults(newResults);

      if (currentIndex + 1 >= total) {
        setIsComplete(true);
        onComplete();
      } else {
        setIsFlipped(false);
        setTimeout(() => setCurrentIndex((prev) => prev + 1), 150);
      }
    },
    [currentWord, currentIndex, total, results, onComplete],
  );

  const handleRetry = useCallback(() => {
    const incorrectWords = results
      .filter((r) => !r.remembered)
      .map((r) => studyWords.find((w) => w.word === r.word))
      .filter((w): w is WordWithKey => w !== undefined);
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
        if (!isFlipped) handleFlip();
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
          <p className="text-gray-500">復習する単語がありません</p>
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

  if (isComplete) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
        <div className="max-w-lg mx-auto py-8">
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
          <StudySessionSummary results={results} onRetry={handleRetry} onClose={onClose} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700" aria-label="閉じる">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-600">
          {currentIndex + 1} / {total}
        </span>
        <div className="w-6" />
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200">
        <div className="h-full bg-navy-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm cursor-pointer" style={{ perspective: "1200px" }} onClick={() => !isFlipped && handleFlip()}>
          <div
            className="relative w-full transition-transform duration-500"
            style={{ transformStyle: "preserve-3d", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)", minHeight: "280px" }}
          >
            {/* Front */}
            <div className="absolute inset-0 rounded-2xl bg-white border border-gray-200 shadow-lg p-8 flex flex-col items-center justify-center" style={{ backfaceVisibility: "hidden" }}>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 select-none">{currentWord?.word}</p>
              <p className="mt-8 text-xs text-gray-300">タップして答えを見る</p>
            </div>
            {/* Back */}
            <div className="absolute inset-0 rounded-2xl bg-white border border-gray-200 shadow-lg p-8 flex flex-col items-center justify-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <p className="text-sm text-gray-500 mb-2">{currentWord?.word}</p>
              <p className="text-lg font-bold text-navy-700 text-center">
                {/* We only have the word here, not definition — show mastery info */}
                復習中
              </p>
              <div className="mt-2">
                <MasteryBadge level={currentWord?.masteryLevel ?? "new"} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="px-4 pb-6 pt-2">
        {isFlipped ? (
          <div className="flex gap-3 max-w-sm mx-auto">
            <button onClick={() => handleAnswer(false)} className="flex-1 py-4 bg-red-50 text-red-700 rounded-xl font-medium text-lg hover:bg-red-100 active:scale-95 transition-all border border-red-200">
              ✗ まだ
            </button>
            <button onClick={() => handleAnswer(true)} className="flex-1 py-4 bg-green-50 text-green-700 rounded-xl font-medium text-lg hover:bg-green-100 active:scale-95 transition-all border border-green-200">
              ✓ 覚えた
            </button>
          </div>
        ) : (
          <div className="max-w-sm mx-auto">
            <button onClick={handleFlip} className="w-full py-4 bg-navy-600 text-white rounded-xl font-medium text-lg hover:bg-navy-700 active:scale-95 transition-all">
              答えを見る
            </button>
          </div>
        )}
        <p className="hidden sm:block text-xs text-gray-300 text-center mt-2">
          {isFlipped ? "← まだ / → 覚えた" : "Space / Enter で答えを表示"}
        </p>
      </div>
    </div>
  );
}

// ── Word Row (expandable) ──

function WordRow({
  wordData,
  isExpanded,
  onToggle,
  onDelete,
}: {
  wordData: WordWithKey;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const accuracy = getAccuracy(wordData.correctCount, wordData.incorrectCount);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full text-left py-3 px-4 hover:bg-gray-50 transition-colors flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{wordData.word}</span>
            <MasteryBadge level={wordData.masteryLevel} />
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
          <span>{accuracy}</span>
          <span>{formatNextReview(wordData.nextReviewDate)}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded-lg p-2">
              <span className="text-gray-500">正答数: </span>
              <span className="font-medium text-gray-700">{wordData.correctCount}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <span className="text-gray-500">誤答数: </span>
              <span className="font-medium text-gray-700">{wordData.incorrectCount}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <span className="text-gray-500">最終復習: </span>
              <span className="font-medium text-gray-700">{formatDate(wordData.lastReviewedAt)}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <span className="text-gray-500">次回復習: </span>
              <span className="font-medium text-gray-700">{formatNextReview(wordData.nextReviewDate)}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <span className="text-gray-500">登録論文: </span>
              <span className="font-medium text-gray-700 truncate">{wordData.paperId ? "あり" : "—"}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <span className="text-gray-500">Ease: </span>
              <span className="font-medium text-gray-700">{wordData.easeFactor.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center pt-1">
            {wordData.paperId && (
              <Link
                href={`/paper/${encodeURIComponent(wordData.paperId)}`}
                className="text-xs text-navy-600 hover:text-navy-700 hover:underline"
              >
                出会った論文を見る →
              </Link>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-xs text-red-400 hover:text-red-600 transition-colors ml-auto"
            >
              削除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──

export default function VocabularyPage() {
  const [allWords, setAllWords] = useState<WordWithKey[]>(() => getAllWords());
  const [stats, setStats] = useState(() => getMasteryStats());
  const [dueWordsList, setDueWordsList] = useState<WordWithKey[]>(() =>
    getDueWords(),
  );
  const [filter, setFilter] = useState<MasteryFilter>("all");
  const [groupByPaper, setGroupByPaper] = useState(false);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [showFlashcard, setShowFlashcard] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadData = useCallback(() => {
    const words = getAllWords();
    setAllWords(words);
    setStats(getMasteryStats());
    setDueWordsList(getDueWords());
  }, []);

  const filteredWords = useMemo(() => {
    if (filter === "all") return allWords;
    return allWords.filter((w) => w.masteryLevel === filter);
  }, [allWords, filter]);

  const groupedByPaper = useMemo(() => {
    if (!groupByPaper) return null;
    const groups: Record<string, WordWithKey[]> = {};
    for (const w of filteredWords) {
      const key = w.paperId || "(不明)";
      if (!groups[key]) groups[key] = [];
      groups[key].push(w);
    }
    return groups;
  }, [filteredWords, groupByPaper]);

  const handleDelete = useCallback(
    (word: string) => {
      deleteWord(word);
      loadData();
      setExpandedWord(null);
    },
    [loadData],
  );

  const handleClearAll = useCallback(() => {
    clearAll();
    loadData();
    setShowClearConfirm(false);
  }, [loadData]);

  const handleFlashcardClose = useCallback(() => {
    setShowFlashcard(false);
    loadData();
  }, [loadData]);

  const handleFlashcardComplete = useCallback(() => {
    loadData();
  }, [loadData]);

  if (showFlashcard) {
    return (
      <ReviewFlashcard
        dueWords={dueWordsList}
        onClose={handleFlashcardClose}
        onComplete={handleFlashcardComplete}
      />
    );
  }

  const dueCount = dueWordsList.length;
  const masteredCount = stats.mastered;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        ホームに戻る
      </Link>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📚 マイ単語帳</h1>
        <p className="text-sm text-gray-500 mt-1">
          論文で出会った英単語の学習記録
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">総単語数</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{masteredCount}</p>
          <p className="text-xs text-green-600 mt-1">習得済み</p>
        </div>
        <div className="bg-navy-50 rounded-xl border border-navy-200 p-4 text-center">
          <p className="text-2xl font-bold text-navy-700">{dueCount}</p>
          <p className="text-xs text-navy-600 mt-1">復習待ち</p>
        </div>
      </div>

      {/* Due Review Section */}
      {dueCount > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-navy-50 border-b border-navy-100 flex items-center justify-between">
            <h2 className="font-semibold text-navy-800 flex items-center gap-2">
              <span>🔔</span> 復習待ち（{dueCount}語）
            </h2>
          </div>
          {/* Due word list (compact) */}
          <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
            {dueWordsList.slice(0, 20).map((w) => (
              <div key={w.word} className="px-4 py-2 flex items-center gap-3">
                <span className="font-medium text-gray-900 text-sm">{w.word}</span>
                <MasteryBadge level={w.masteryLevel} />
                <span className="text-xs text-gray-400 ml-auto">{formatDate(w.lastReviewedAt)}</span>
              </div>
            ))}
            {dueCount > 20 && (
              <div className="px-4 py-2 text-xs text-gray-400 text-center">
                他 {dueCount - 20} 語
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => setShowFlashcard(true)}
              className="w-full py-3 bg-navy-600 text-white rounded-xl font-medium hover:bg-navy-700 transition-colors flex items-center justify-center gap-2"
            >
              <span>📚</span>
              <span>フラッシュカードで復習する</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{dueCount}語</span>
            </button>
          </div>
        </div>
      )}

      {/* Mastery Dashboard */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">📊 習熟度ダッシュボード</h2>
        <MasteryDonutChart stats={stats} />
      </div>

      {/* All Words Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 space-y-3">
          <h2 className="font-semibold text-gray-900">📋 全単語一覧</h2>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "new", "learning", "reviewing", "mastered"] as const).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-navy-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f === "all" ? "全部" : MASTERY_LABELS[f]}
                  {f === "all"
                    ? ` (${stats.total})`
                    : ` (${stats[f]})`}
                </button>
              ),
            )}
          </div>
          {/* Group toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGroupByPaper(!groupByPaper)}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                groupByPaper
                  ? "bg-navy-100 text-navy-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {groupByPaper ? "📑 論文別表示" : "📑 論文別に表示"}
            </button>
            <span className="text-xs text-gray-400 ml-auto">
              {filteredWords.length}語
            </span>
          </div>
        </div>

        {/* Word list */}
        {filteredWords.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            {stats.total === 0
              ? "まだ単語がありません。論文ページで語彙分析をして、単語を登録しましょう！"
              : "該当する単語がありません"}
          </div>
        ) : groupedByPaper && groupedByPaper ? (
          <div>
            {Object.entries(groupedByPaper).map(([paperId, words]) => (
              <div key={paperId}>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 truncate">
                    📄 {paperId === "(不明)" ? "不明な論文" : paperId}
                  </p>
                  <span className="text-xs text-gray-400">{words.length}語</span>
                </div>
                {words.map((w) => (
                  <WordRow
                    key={w.word}
                    wordData={w}
                    isExpanded={expandedWord === w.word}
                    onToggle={() => setExpandedWord(expandedWord === w.word ? null : w.word)}
                    onDelete={() => handleDelete(w.word)}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div>
            {filteredWords.map((w) => (
              <WordRow
                key={w.word}
                wordData={w}
                isExpanded={expandedWord === w.word}
                onToggle={() => setExpandedWord(expandedWord === w.word ? null : w.word)}
                onDelete={() => handleDelete(w.word)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Clear all button */}
      {stats.total > 0 && (
        <div className="text-center pt-4 pb-8">
          {showClearConfirm ? (
            <div className="inline-flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-700">本当にすべてのデータを削除しますか？</p>
              <button
                onClick={handleClearAll}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                削除する
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              すべての学習データをリセット
            </button>
          )}
        </div>
      )}
    </div>
  );
}
