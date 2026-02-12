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

function TrialBanner() {
  const { locale } = useLanguage();

  return (
    <div className="relative mt-8">
      {/* Gradient overlay on last papers */}
      <div className="absolute -top-32 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none z-10" />
      {/* Glass banner */}
      <div className="relative z-20 bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-gray-900 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">
          {t(locale, "trialBannerTitle")}
        </h3>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          {t(locale, "trialBannerDesc")}
        </p>
        <Link
          href="/auth/login"
          onClick={(e) => {
            e.preventDefault();
            // Trigger Google login via the auth context
            document.dispatchEvent(new CustomEvent("lohas-open-login"));
          }}
          className="mt-5 inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-all shadow-lg"
        >
          {t(locale, "trialBannerCta")}
        </Link>
        <p className="mt-3 text-xs text-gray-400">
          {t(locale, "loginBonus")}
        </p>
      </div>
    </div>
  );
}

function ResultsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale } = useLanguage();
  const { refreshCredits, user, signInWithGoogle } = useAuth();

  const query = searchParams.get("q") || "";
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const lastSearchRef = useRef<string>("");
  const refreshCreditsRef = useRef(refreshCredits);
  refreshCreditsRef.current = refreshCredits;

  // Listen for login trigger from trial banner
  useEffect(() => {
    const handler = () => {
      signInWithGoogle(`/results?q=${encodeURIComponent(query)}`);
    };
    document.addEventListener("lohas-open-login", handler);
    return () => document.removeEventListener("lohas-open-login", handler);
  }, [query, signInWithGoogle]);

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
      setIsTrial(false);
      try {
        addSearchHistory(query);
        const res = await searchWithAI(query, locale);
        if (!cancelled) {
          setResult(res);
          setCachedResult(query, locale, res);
          if ((res as unknown as Record<string, unknown>).is_trial) {
            setIsTrial(true);
          } else {
            refreshCreditsRef.current();
          }
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
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors inline-block"
            >
              {t(locale, "buyCredits")}
            </Link>
          ) : (
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
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

          {isTrial && <TrialBanner />}
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

export default function ResultsContent() {
  return (
    <Suspense fallback={<SearchProgress />}>
      <ResultsInner />
    </Suspense>
  );
}
