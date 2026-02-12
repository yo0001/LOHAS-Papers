"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import {
  getPaperDetailWithAI,
  getFulltextTranslationWithAI,
  AuthRequiredError,
  InsufficientCreditsError,
  type PaperDetailResponse,
  type FulltextSection,
} from "@/lib/api";
import {
  addFavorite,
  removeFavorite,
  isFavorite,
  type FavoritePaper,
} from "@/lib/favorites";
import DifficultyTabs from "@/components/DifficultyTabs";
import FulltextViewer from "@/components/FulltextViewer";
import EvidenceBadge from "@/components/EvidenceBadge";
import LoginModal from "@/components/LoginModal";
import { useAuth } from "@/contexts/AuthContext";

type Difficulty = "expert" | "layperson" | "children";

function PaperDetailContent() {
  const params = useParams();
  const { locale } = useLanguage();
  const { refreshCredits } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const rawId = params.id;
  const paperId = typeof rawId === "string" ? decodeURIComponent(rawId) : "";
  const [detail, setDetail] = useState<PaperDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("layperson");
  const [showOriginalAbstract, setShowOriginalAbstract] = useState(false);
  const [fav, setFav] = useState(false);

  // Fulltext
  const [fulltextSections, setFulltextSections] = useState<FulltextSection[] | null>(null);
  const [fulltextLoading, setFulltextLoading] = useState(false);
  const [fulltextDifficulty, setFulltextDifficulty] = useState<Difficulty>("layperson");
  const [fulltextError, setFulltextError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!paperId) return;
    setLoading(true);
    setError(null);
    try {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await getPaperDetailWithAI(paperId, locale);
          setDetail(res);
          setFav(isFavorite(paperId));
          refreshCredits();
          return;
        } catch (e) {
          if (e instanceof AuthRequiredError) {
            setShowLogin(true);
            return;
          }
          if (e instanceof InsufficientCreditsError) {
            setError(t(locale, "insufficientCredits"));
            return;
          }
          console.error(`Paper detail fetch error (attempt ${attempt + 1}/3):`, e);
          lastError = e;
          if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
      throw lastError;
    } catch {
      setError(t(locale, "errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [paperId, locale]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const toggleFavorite = () => {
    if (!detail) return;
    if (fav) {
      removeFavorite(paperId);
      setFav(false);
    } else {
      const favPaper: FavoritePaper = {
        id: paperId,
        title: detail.title_original,
        titleTranslated: detail.title_translated ?? undefined,
        authors: detail.authors.map((a) => a.name),
        journal: detail.journal ?? undefined,
        year: detail.year ?? undefined,
        citationCount: detail.citation_count,
        savedAt: new Date().toISOString(),
      };
      addFavorite(favPaper);
      setFav(true);
    }
  };

  const loadFulltext = async () => {
    setFulltextLoading(true);
    setFulltextError(null);
    try {
      const res = await getFulltextTranslationWithAI(paperId, locale, fulltextDifficulty);
      setFulltextSections(res.sections);
      refreshCredits();
    } catch (e: unknown) {
      if (e instanceof AuthRequiredError) {
        setShowLogin(true);
        setFulltextLoading(false);
        return;
      }
      if (e instanceof InsufficientCreditsError) {
        setFulltextError(t(locale, "insufficientCredits"));
        setFulltextLoading(false);
        return;
      }
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("404")) {
        setFulltextError(t(locale, "fulltextNotAvailable"));
      } else if (msg.includes("422")) {
        setFulltextError(t(locale, "fulltextPdfError"));
      } else {
        setFulltextError(t(locale, "errorGeneric"));
      }
    } finally {
      setFulltextLoading(false);
    }
  };

  const getAbstractText = (): string => {
    if (showOriginalAbstract || !detail?.abstract_translations) {
      return detail?.abstract_original || "";
    }
    const translations = detail.abstract_translations;
    return translations[difficulty] || detail.abstract_original || "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-full border-4 border-navy-200 border-t-navy-600 animate-spin" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error || t(locale, "errorGeneric")}</p>
        <button
          onClick={fetchDetail}
          className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors"
        >
          {t(locale, "retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Back link */}
      <Link
        href="/results"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t(locale, "backToResults")}
      </Link>

      {/* Title */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          {detail.title_translated || detail.title_original}
        </h1>
        {detail.title_translated && (
          <p className="text-sm text-gray-400">{detail.title_original}</p>
        )}
      </div>

      {/* Authors & Meta */}
      <div className="space-y-2 text-sm text-gray-600">
        <p>{detail.authors.map((a) => a.name).join(", ")}</p>
        <div className="flex flex-wrap items-center gap-3">
          {detail.journal && <span>{detail.journal}</span>}
          {detail.year && <span>{detail.year}</span>}
          {detail.citation_count > 0 && (
            <span>{t(locale, "citations")}: {detail.citation_count}</span>
          )}
          {detail.is_open_access && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {t(locale, "openAccess")}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={toggleFavorite}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            fav
              ? "bg-navy-100 text-navy-700 hover:bg-navy-200"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {fav ? t(locale, "removeFromFavorites") : t(locale, "saveToFavorites")}
        </button>
        {detail.pubmed_url && (
          <a
            href={detail.pubmed_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {t(locale, "viewOnPubMed")}
          </a>
        )}
        {detail.semantic_scholar_url && (
          <a
            href={detail.semantic_scholar_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {t(locale, "viewOnSemanticScholar")}
          </a>
        )}
        {detail.pdf_url && (
          <a
            href={detail.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {t(locale, "viewPDF")}
          </a>
        )}
      </div>

      {/* Abstract */}
      {detail.abstract_original && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{t(locale, "abstract")}</h2>
            <button
              onClick={() => setShowOriginalAbstract(!showOriginalAbstract)}
              className="text-xs text-navy-600 hover:text-navy-700 transition-colors"
            >
              {showOriginalAbstract ? t(locale, "abstractTranslated") : t(locale, "abstractOriginal")}
            </button>
          </div>

          {!showOriginalAbstract && detail.abstract_translations && (
            <DifficultyTabs selected={difficulty} onChange={setDifficulty} />
          )}

          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {getAbstractText()}
          </p>
        </div>
      )}

      {/* Summary */}
      {detail.summary && (
        <div className="bg-navy-50 rounded-xl border border-navy-200 p-5 space-y-2">
          <h2 className="font-semibold text-navy-800">{t(locale, "aiAnswer")}</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{detail.summary}</p>
        </div>
      )}

      {/* Fulltext Translation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">{t(locale, "fulltextTranslation")}</h2>

        {!detail.is_open_access ? (
          <p className="text-sm text-gray-500">{t(locale, "fulltextNotAvailable")}</p>
        ) : fulltextSections ? (
          <FulltextViewer sections={fulltextSections} />
        ) : (
          <div className="space-y-3">
            <DifficultyTabs selected={fulltextDifficulty} onChange={setFulltextDifficulty} />
            <button
              onClick={loadFulltext}
              disabled={fulltextLoading}
              className="w-full py-3 bg-navy-600 text-white rounded-lg font-medium hover:bg-navy-700 disabled:opacity-50 transition-colors"
            >
              {fulltextLoading ? t(locale, "fulltextLoading") : t(locale, "fulltextTranslation")}
            </button>
            {fulltextError && (
              <p className="text-sm text-red-500">{fulltextError}</p>
            )}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 text-center pb-6">
        {t(locale, "disclaimerText")}
      </p>

      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        redirectTo={`/paper/${encodeURIComponent(paperId)}`}
      />
    </div>
  );
}

export default function PaperDetailPage() {
  return <PaperDetailContent />;
}
