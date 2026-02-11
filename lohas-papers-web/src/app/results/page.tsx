"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/lib/i18n";
import {
  searchWithAI,
  AuthRequiredError,
  InsufficientCreditsError,
  type SearchResponse,
} from "@/lib/api";
import { addSearchHistory } from "@/lib/favorites";
import SearchBar from "@/components/SearchBar";
import SearchProgress from "@/components/SearchProgress";
import AISummaryCard from "@/components/AISummaryCard";
import PaperCard from "@/components/PaperCard";
import LoginModal from "@/components/LoginModal";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale } = useLanguage();
  const { user, refreshCredits } = useAuth();

  const query = searchParams.get("q") || "";
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const doSearch = useCallback(async (q: string, lang: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      addSearchHistory(q);
      const res = await searchWithAI(q, lang);
      setResult(res);
      refreshCredits();
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        setShowLogin(true);
      } else if (e instanceof InsufficientCreditsError) {
        setError(t(lang as "ja", "insufficientCredits"));
      } else {
        setError(t(lang as "ja", "errorNetwork"));
      }
    } finally {
      setLoading(false);
    }
  }, [refreshCredits]);

  useEffect(() => {
    if (query) {
      doSearch(query, locale);
    }
  }, [query, locale, doSearch]);

  const handleSearch = (newQuery: string) => {
    router.push(`/results?q=${encodeURIComponent(newQuery)}&lang=${locale}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <SearchBar onSearch={handleSearch} initialQuery={query} />

      {loading && <SearchProgress />}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => doSearch(query, locale)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {t(locale, "retry")}
          </button>
        </div>
      )}

      {result && !loading && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {result.total_results} {t(locale, "papers")}
            </p>
          </div>

          {result.ai_summary.text && (
            <AISummaryCard
              text={result.ai_summary.text}
              paperCount={result.total_results}
            />
          )}

          <div className="space-y-3">
            {result.papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>

          {result.papers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">{t(locale, "noResults")}</p>
            </div>
          )}
        </>
      )}

      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        redirectTo={`/results?q=${encodeURIComponent(query)}`}
      />
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<SearchProgress />}>
      <ResultsContent />
    </Suspense>
  );
}
