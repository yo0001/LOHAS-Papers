"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import { getFavorites, removeFavorite, type FavoritePaper } from "@/lib/favorites";

export default function FavoritesPage() {
  const { locale } = useLanguage();
  const [favorites, setFavorites] = useState<FavoritePaper[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const handleRemove = (id: string) => {
    removeFavorite(id);
    setFavorites(getFavorites());
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t(locale, "favorites")}</h1>

      {favorites.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">{t(locale, "noResults")}</p>
          <Link
            href="/"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {t(locale, "searchButton")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((paper) => (
            <div
              key={paper.id}
              className="bg-white rounded-xl border border-gray-200 p-5 space-y-2"
            >
              <div className="flex items-start justify-between gap-4">
                <Link
                  href={`/paper/${encodeURIComponent(paper.id)}?lang=${locale}`}
                  className="flex-1"
                >
                  <h3 className="font-medium text-gray-900 hover:text-emerald-700 transition-colors">
                    {paper.titleTranslated || paper.title}
                  </h3>
                  {paper.titleTranslated && (
                    <p className="text-xs text-gray-400 mt-1">{paper.title}</p>
                  )}
                </Link>
                <button
                  onClick={() => handleRemove(paper.id)}
                  className="text-xs text-red-400 hover:text-red-600 whitespace-nowrap transition-colors"
                >
                  {t(locale, "removeFromFavorites")}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {paper.authors.length > 0 && (
                  <span>{paper.authors.slice(0, 3).join(", ")}</span>
                )}
                {paper.journal && <span>| {paper.journal}</span>}
                {paper.year && <span>| {paper.year}</span>}
                {paper.citationCount > 0 && (
                  <span>| {t(locale, "citations")}: {paper.citationCount}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
