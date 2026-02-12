"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";

interface ShareButtonProps {
  query: string;
  paperCount: number;
}

export default function ShareButton({ query, paperCount }: ShareButtonProps) {
  const { locale } = useLanguage();

  const handleShare = () => {
    const text =
      locale === "ja"
        ? `「${query}」について${paperCount}件の論文をAI要約で確認しました #LOHASPapers`
        : `Checked AI summaries of ${paperCount} papers about "${query}" #LOHASPapers`;
    const url = `https://lohas-papers-web.vercel.app/results?q=${encodeURIComponent(query)}&lang=${locale}`;
    const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer,width=550,height=420");
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:border-gray-400 hover:text-gray-900 transition-colors"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      {t(locale, "share")}
    </button>
  );
}
