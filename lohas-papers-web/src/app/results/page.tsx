"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/lib/i18n";
import {
  searchWithAI,
  AuthRequiredError,
  InsufficientCreditsError,
  type SearchResponse,
} from "@/lib/api";
import { addSearchHistory, getCachedResult, setCachedResult } from "@/lib/favorites";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SearchProgress from "@/components/SearchProgress";
import AISummaryCard from "@/components/AISummaryCard";
import PaperCard from "@/components/PaperCard";
import LoginModal from "@/components/LoginModal";
import ShareButton from "@/components/ShareButton";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale } = useLanguage();
  const { refreshCredits } = useAuth();

  const query = searchParams.get("q") || "";
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const lastSearchRef = useRef<string>("");
  const refreshCreditsRef = useRef(refreshCredits);
  refreshCreditsRef.current = refreshCredits;

  useEffect(() => {
    if (!query) return;

    const searchKey = `${query}_${locale}`;
    if (lastSearchRef.current === searchKey) return;
    lastSearchRef.current = searchKey;

    // Check cache first
    const cached = getCachedResult(query, locale) as SearchResponse | null;
    if (cached) {
      setResult(cached);
      setError(null);
      setLoading(false);
      return;
    }

    // No cache — call API
    let cancelled = false;
    const doSearch = async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        addSearchHistory(query);
        const res = await searchWithAI(query, locale);
        if (!cancelled) {
          setResult(res);
          setCachedResult(query, locale, res);
          refreshCreditsRef.current();
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof AuthRequiredError) {
          setShowLogin(true);
        } else if (e instanceof InsufficientCreditsError) {
          setError("insufficientCredits");
        } else {
          setError(t(locale, "errorNetwork"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doSearch();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, locale]);

  const handleSearch = (newQuery: string) => {
    lastSearchRef.current = "";
    router.push(`/results?q=${encodeURIComponent(newQuery)}&lang=${locale}`);
  };

  const handleRetry = () => {
    lastSearchRef.current = "";
    setError(null);
    setResult(null);
    // Trigger re-search by resetting ref — the effect will re-run on next render
    // Force re-render by using router
    router.push(`/results?q=${encodeURIComponent(query)}&lang=${locale}&t=${Date.now()}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <SearchBar onSearch={handleSearch} initialQuery={query} />

      {loading && <SearchProgress />}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">
            {error === "insufficientCredits" ? t(locale, "insufficientCredits") : error}
          </p>
          {error === "insufficientCredits" ? (
            <Link
              href="/pricing"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors inline-block"
            >
              {t(locale, "buyCredits")}
            </Link>
          ) : (
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {t(locale, "retry")}
            </button>
          )}
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
            <>
              <AISummaryCard
                text={result.ai_summary.text}
                paperCount={result.total_results}
              />
              <div className="flex justify-end">
                <ShareButton query={query} paperCount={result.total_results} />
              </div>
            </>
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
