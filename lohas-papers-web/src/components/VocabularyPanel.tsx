"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { VocabularyWord, VocabularyAnalysisResponse } from "@/lib/api";
import {
  getPaperKnownMap,
  setPaperWordKnown,
} from "@/lib/vocabulary-storage";
import FlashcardView from "./FlashcardView";

interface VocabularyPanelProps {
  data: VocabularyAnalysisResponse;
}

type SortKey = "difficulty" | "frequency" | "alphabetical";
type CategoryFilter = "all" | "medical" | "academic" | "general";
type KnownFilter = "all" | "known" | "unknown" | "unsorted";

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "基礎",
  2: "中級",
  3: "上級",
  4: "医学用語",
  5: "高度専門",
};

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-green-100 text-green-800",
  2: "bg-blue-100 text-blue-800",
  3: "bg-yellow-100 text-yellow-800",
  4: "bg-orange-100 text-orange-800",
  5: "bg-red-100 text-red-800",
};

const CATEGORY_LABELS: Record<string, string> = {
  medical: "医学",
  academic: "学術",
  general: "一般",
};

const CATEGORY_COLORS: Record<string, string> = {
  medical: "bg-rose-100 text-rose-700",
  academic: "bg-indigo-100 text-indigo-700",
  general: "bg-gray-100 text-gray-700",
};

function DifficultyBadge({ level }: { level: number }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[level] || "bg-gray-100 text-gray-800"}`}
    >
      {DIFFICULTY_LABELS[level] || `Lv.${level}`}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[category] || "bg-gray-100 text-gray-700"}`}
    >
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

function DifficultyBar({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const total = Object.values(distribution).reduce((sum, n) => sum + n, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-1.5">
      {[1, 2, 3, 4, 5].map((level) => {
        const count = distribution[String(level)] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={level} className="flex items-center gap-2 text-xs">
            <span className="w-16 text-gray-500 shrink-0">
              {DIFFICULTY_LABELS[level]}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  level <= 2
                    ? "bg-green-400"
                    : level === 3
                      ? "bg-yellow-400"
                      : level === 4
                        ? "bg-orange-400"
                        : "bg-red-400"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-right text-gray-500">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function WordRow({
  word,
  isExpanded,
  onToggle,
  knownStatus,
  onMarkKnown,
  onMarkUnknown,
}: {
  word: VocabularyWord;
  isExpanded: boolean;
  onToggle: () => void;
  knownStatus: boolean | undefined;
  onMarkKnown: () => void;
  onMarkUnknown: () => void;
}) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="flex items-center">
        {/* Known/Unknown buttons */}
        <div className="flex flex-col gap-0.5 px-1.5 py-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkKnown();
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
              knownStatus === true
                ? "bg-green-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600"
            }`}
            title="知ってる"
            aria-label="知ってる"
          >
            ✓
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkUnknown();
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
              knownStatus === false
                ? "bg-red-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600"
            }`}
            title="知らない"
            aria-label="知らない"
          >
            ✗
          </button>
        </div>

        {/* Word content (clickable for expand) */}
        <button
          onClick={onToggle}
          className="flex-1 text-left py-3 px-1 hover:bg-gray-50 transition-colors flex items-center gap-3 min-w-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{word.word}</span>
              <span className="text-sm text-gray-500 truncate">
                {word.definition}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400">{word.partOfSpeech}</span>
            <DifficultyBadge level={word.difficulty} />
            <span className="text-xs text-gray-400 w-6 text-right">
              ×{word.frequency}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 ml-10 space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <CategoryBadge category={word.category} />
            {word.subcategory && (
              <span className="text-xs text-gray-400">{word.subcategory}</span>
            )}
            {word.pronunciation && (
              <span className="text-xs text-gray-500 font-mono">
                /{word.pronunciation}/
              </span>
            )}
          </div>

          {word.contexts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">
                論文中の使用例:
              </p>
              {word.contexts.map((ctx, i) => (
                <p
                  key={i}
                  className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 leading-relaxed"
                >
                  &ldquo;...{highlightWord(ctx, word.word)}...&rdquo;
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function highlightWord(text: string, word: string) {
  const regex = new RegExp(`(\\b${escapeRegex(word)}\\b)`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span
        key={i}
        className="font-bold text-navy-700 underline underline-offset-2"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function VocabularyPanel({ data }: VocabularyPanelProps) {
  const paperId = data.paper_id;

  const [sortBy, setSortBy] = useState<SortKey>("difficulty");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<number | null>(null);
  const [knownFilter, setKnownFilter] = useState<KnownFilter>("all");
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [showAllWords, setShowAllWords] = useState(false);
  const [showFlashcard, setShowFlashcard] = useState(false);

  // Known/unknown state from localStorage
  const [knownMap, setKnownMap] = useState<Record<string, boolean>>({});

  // Load from localStorage on mount
  useEffect(() => {
    setKnownMap(getPaperKnownMap(paperId));
  }, [paperId]);

  const handleMarkKnown = useCallback(
    (word: string) => {
      const current = knownMap[word.toLowerCase()];
      if (current === true) {
        const newMap = { ...knownMap };
        delete newMap[word.toLowerCase()];
        setKnownMap(newMap);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `vocab-known-${paperId}`,
            JSON.stringify(newMap),
          );
        }
      } else {
        setPaperWordKnown(paperId, word, true);
        setKnownMap((prev) => ({ ...prev, [word.toLowerCase()]: true }));
      }
    },
    [knownMap, paperId],
  );

  const handleMarkUnknown = useCallback(
    (word: string) => {
      const current = knownMap[word.toLowerCase()];
      if (current === false) {
        const newMap = { ...knownMap };
        delete newMap[word.toLowerCase()];
        setKnownMap(newMap);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `vocab-known-${paperId}`,
            JSON.stringify(newMap),
          );
        }
      } else {
        setPaperWordKnown(paperId, word, false);
        setKnownMap((prev) => ({ ...prev, [word.toLowerCase()]: false }));
      }
    },
    [knownMap, paperId],
  );

  const unknownCount = useMemo(
    () => Object.values(knownMap).filter((v) => v === false).length,
    [knownMap],
  );

  const knownCount = useMemo(
    () => Object.values(knownMap).filter((v) => v === true).length,
    [knownMap],
  );

  const filteredAndSorted = useMemo(() => {
    let words = [...data.words];

    if (categoryFilter !== "all") {
      words = words.filter((w) => w.category === categoryFilter);
    }
    if (difficultyFilter !== null) {
      words = words.filter((w) => w.difficulty === difficultyFilter);
    }
    if (knownFilter !== "all") {
      words = words.filter((w) => {
        const status = knownMap[w.word.toLowerCase()];
        if (knownFilter === "known") return status === true;
        if (knownFilter === "unknown") return status === false;
        if (knownFilter === "unsorted") return status === undefined;
        return true;
      });
    }

    switch (sortBy) {
      case "difficulty":
        words.sort(
          (a, b) => b.difficulty - a.difficulty || b.frequency - a.frequency,
        );
        break;
      case "frequency":
        words.sort((a, b) => b.frequency - a.frequency);
        break;
      case "alphabetical":
        words.sort((a, b) => a.word.localeCompare(b.word));
        break;
    }

    return words;
  }, [data.words, sortBy, categoryFilter, difficultyFilter, knownFilter, knownMap]);

  const unknownWords = useMemo(
    () =>
      data.words.filter(
        (w) => knownMap[w.word.toLowerCase()] === false,
      ),
    [data.words, knownMap],
  );

  const displayedWords = showAllWords
    ? filteredAndSorted
    : filteredAndSorted.slice(0, 50);

  const handleFlashcardComplete = useCallback(() => {
    setKnownMap(getPaperKnownMap(paperId));
  }, [paperId]);

  if (showFlashcard) {
    return (
      <FlashcardView
        words={unknownWords}
        paperId={paperId}
        onClose={() => {
          setShowFlashcard(false);
          handleFlashcardComplete();
        }}
        onComplete={handleFlashcardComplete}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-navy-50 rounded-lg p-3">
          <p className="text-xs text-navy-600">抽出単語数</p>
          <p className="text-xl font-bold text-navy-800">{data.unique_words}</p>
          <p className="text-xs text-gray-400">
            総語数: {data.total_words.toLocaleString()}
          </p>
        </div>
        <div className="bg-navy-50 rounded-lg p-3">
          <p className="text-xs text-navy-600">カテゴリ内訳</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs">🏥 {data.summary.medical}</span>
            <span className="text-xs">📖 {data.summary.academic}</span>
            <span className="text-xs">📝 {data.summary.general}</span>
          </div>
        </div>
      </div>

      {/* Difficulty distribution */}
      <div className="bg-white rounded-lg p-3 border border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-2">難易度分布</p>
        <DifficultyBar distribution={data.summary.difficulty_distribution} />
      </div>

      {/* Known/Unknown Summary + Flashcard Button */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">仕分け状況</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              知ってる {knownCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              知らない{" "}
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-red-100 text-red-700 rounded-full font-medium">
                {unknownCount}
              </span>
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              未仕分け {data.words.length - knownCount - unknownCount}
            </span>
          </div>
        </div>

        {unknownCount > 0 && (
          <button
            onClick={() => setShowFlashcard(true)}
            className="w-full py-3 bg-navy-600 text-white rounded-xl font-medium hover:bg-navy-700 transition-colors flex items-center justify-center gap-2"
          >
            <span>📚</span>
            <span>フラッシュカードで学習</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {unknownCount}語
            </span>
          </button>
        )}
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
        >
          <option value="difficulty">難易度順</option>
          <option value="frequency">頻度順</option>
          <option value="alphabetical">アルファベット順</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
        >
          <option value="all">全カテゴリ</option>
          <option value="medical">🏥 医学用語</option>
          <option value="academic">📖 学術用語</option>
          <option value="general">📝 一般語</option>
        </select>

        <select
          value={difficultyFilter ?? "all"}
          onChange={(e) => {
            const val = e.target.value;
            setDifficultyFilter(val === "all" ? null : Number(val));
          }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
        >
          <option value="all">全難易度</option>
          <option value="1">Lv.1 基礎</option>
          <option value="2">Lv.2 中級</option>
          <option value="3">Lv.3 上級</option>
          <option value="4">Lv.4 医学用語</option>
          <option value="5">Lv.5 高度専門</option>
        </select>

        <select
          value={knownFilter}
          onChange={(e) => setKnownFilter(e.target.value as KnownFilter)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
        >
          <option value="all">全ステータス</option>
          <option value="unknown">✗ 知らない</option>
          <option value="known">✓ 知ってる</option>
          <option value="unsorted">未仕分け</option>
        </select>

        <span className="text-xs text-gray-400 ml-auto">
          {filteredAndSorted.length}語
        </span>
      </div>

      {/* Word list */}
      <div className="divide-y divide-gray-100">
        {displayedWords.map((word) => (
          <WordRow
            key={word.word}
            word={word}
            isExpanded={expandedWord === word.word}
            onToggle={() =>
              setExpandedWord(expandedWord === word.word ? null : word.word)
            }
            knownStatus={knownMap[word.word.toLowerCase()]}
            onMarkKnown={() => handleMarkKnown(word.word)}
            onMarkUnknown={() => handleMarkUnknown(word.word)}
          />
        ))}
      </div>

      {!showAllWords && filteredAndSorted.length > 50 && (
        <button
          onClick={() => setShowAllWords(true)}
          className="w-full py-2 text-sm text-navy-600 hover:text-navy-700 transition-colors"
        >
          残り{filteredAndSorted.length - 50}語を表示する
        </button>
      )}

      {filteredAndSorted.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          該当する単語がありません
        </p>
      )}
    </div>
  );
}
