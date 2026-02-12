"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  large?: boolean;
}

export default function SearchBar({ onSearch, initialQuery = "", large = false }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const { locale } = useLanguage();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) onSearch(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`flex items-center gap-2 ${large ? "max-w-2xl mx-auto" : ""}`}>
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(locale, "searchPlaceholder")}
            className={`w-full pl-10 pr-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
              large ? "py-3 text-base sm:py-4 sm:text-lg" : "py-2.5 text-sm"
            }`}
          />
        </div>
        <button
          type="submit"
          className={`bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors whitespace-nowrap ${
            large ? "px-5 py-3 text-base sm:px-8 sm:py-4 sm:text-lg" : "px-5 py-2.5 text-sm"
          }`}
        >
          {t(locale, "searchButton")}
        </button>
      </div>
    </form>
  );
}
