"use client";

import type { MasteryLevel } from "@/lib/spaced-repetition";

export interface SessionResult {
  word: string;
  remembered: boolean;
  previousMastery: MasteryLevel;
  newMastery: MasteryLevel;
}

interface StudySessionSummaryProps {
  results: SessionResult[];
  onRetry: () => void;
  onClose: () => void;
}

const MASTERY_LABELS: Record<MasteryLevel, string> = {
  new: "新規",
  learning: "学習中",
  reviewing: "復習中",
  mastered: "習得済み",
};

const MASTERY_EMOJI: Record<MasteryLevel, string> = {
  new: "🆕",
  learning: "📖",
  reviewing: "🔄",
  mastered: "⭐",
};

export default function StudySessionSummary({
  results,
  onRetry,
  onClose,
}: StudySessionSummaryProps) {
  const total = results.length;
  const correctCount = results.filter((r) => r.remembered).length;
  const incorrectCount = total - correctCount;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // Count mastery level changes
  const levelUps = results.filter(
    (r) => getMasteryOrder(r.newMastery) > getMasteryOrder(r.previousMastery),
  );
  const levelDowns = results.filter(
    (r) => getMasteryOrder(r.newMastery) < getMasteryOrder(r.previousMastery),
  );

  const emoji =
    accuracy >= 80 ? "🎉" : accuracy >= 50 ? "💪" : "📚";
  const message =
    accuracy >= 80
      ? "素晴らしい！よく覚えていますね！"
      : accuracy >= 50
        ? "いい調子！もう少し復習しましょう"
        : "繰り返し学習が大切です。頑張りましょう！";

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 space-y-6">
      {/* Emoji & Message */}
      <div className="text-center space-y-2">
        <div className="text-6xl">{emoji}</div>
        <h2 className="text-xl font-bold text-gray-900">学習完了！</h2>
        <p className="text-sm text-gray-600">{message}</p>
      </div>

      {/* Score Circle */}
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke={accuracy >= 80 ? "#22c55e" : accuracy >= 50 ? "#eab308" : "#ef4444"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(accuracy / 100) * 352} 352`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">{accuracy}%</span>
          <span className="text-xs text-gray-500">正答率</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
        <div className="text-center p-3 bg-green-50 rounded-xl">
          <p className="text-2xl font-bold text-green-700">{correctCount}</p>
          <p className="text-xs text-green-600">覚えた</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-xl">
          <p className="text-2xl font-bold text-red-700">{incorrectCount}</p>
          <p className="text-xs text-red-600">まだ</p>
        </div>
        <div className="text-center p-3 bg-navy-50 rounded-xl">
          <p className="text-2xl font-bold text-navy-700">{total}</p>
          <p className="text-xs text-navy-600">合計</p>
        </div>
      </div>

      {/* Mastery Changes */}
      {(levelUps.length > 0 || levelDowns.length > 0) && (
        <div className="w-full max-w-sm space-y-2">
          <h3 className="text-sm font-medium text-gray-700">習熟度の変化</h3>
          {levelUps.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-2">
              <span>⬆️</span>
              <span>
                {levelUps.length}語がレベルアップ
              </span>
            </div>
          )}
          {levelDowns.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 rounded-lg p-2">
              <span>⬇️</span>
              <span>
                {levelDowns.length}語がレベルダウン
              </span>
            </div>
          )}
          <div className="space-y-1">
            {levelUps.slice(0, 5).map((r) => (
              <div
                key={r.word}
                className="flex items-center justify-between text-xs text-gray-600 px-1"
              >
                <span className="font-medium">{r.word}</span>
                <span>
                  {MASTERY_EMOJI[r.previousMastery]} {MASTERY_LABELS[r.previousMastery]}
                  {" → "}
                  {MASTERY_EMOJI[r.newMastery]} {MASTERY_LABELS[r.newMastery]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-sm">
        {incorrectCount > 0 && (
          <button
            onClick={onRetry}
            className="flex-1 py-3 bg-navy-600 text-white rounded-xl font-medium hover:bg-navy-700 transition-colors"
          >
            🔄 もう一度
          </button>
        )}
        <button
          onClick={onClose}
          className={`${incorrectCount > 0 ? "flex-1" : "w-full"} py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors`}
        >
          📋 単語リストに戻る
        </button>
      </div>
    </div>
  );
}

function getMasteryOrder(level: MasteryLevel): number {
  const order: Record<MasteryLevel, number> = {
    new: 0,
    learning: 1,
    reviewing: 2,
    mastered: 3,
  };
  return order[level];
}
