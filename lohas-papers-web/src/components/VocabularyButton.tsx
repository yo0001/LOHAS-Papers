"use client";

interface VocabularyButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}

export default function VocabularyButton({
  onClick,
  loading,
  disabled,
}: VocabularyButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full py-3 bg-navy-600 text-white rounded-lg font-medium hover:bg-navy-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          <span>語彙を分析中...</span>
        </>
      ) : (
        <>
          <span>📚</span>
          <span>英単語を抽出する</span>
        </>
      )}
    </button>
  );
}
