"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import SearchBar from "@/components/SearchBar";
import { getSearchHistory, clearSearchHistory } from "@/lib/favorites";

export default function HomePage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  const handleSearch = (query: string) => {
    router.push(`/results?q=${encodeURIComponent(query)}&lang=${locale}`);
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
      <div className="w-full max-w-2xl space-y-8 -mt-20">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-emerald-700">LOHAS Papers</h1>
          <p className="text-gray-500 text-sm">
            AI-powered academic paper search & multilingual summarization
          </p>
        </div>

        <SearchBar onSearch={handleSearch} large />

        {history.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-500">{t(locale, "recentSearches")}</h2>
              <button
                onClick={handleClearHistory}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                {t(locale, "clearHistory")}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(q)}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-full hover:border-emerald-400 hover:text-emerald-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
