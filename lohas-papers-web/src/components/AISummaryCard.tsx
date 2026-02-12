"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { t, getBasedOnPapers } from "@/lib/i18n";

interface AISummaryCardProps {
  text: string;
  paperCount: number;
}

export default function AISummaryCard({ text, paperCount }: AISummaryCardProps) {
  const { locale } = useLanguage();
  const [expanded, setExpanded] = useState(true);

  if (!text) return null;

  return (
    <div className="bg-gradient-to-br from-navy-50 to-navy-100 rounded-2xl border border-navy-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h2 className="font-semibold text-navy-800">{t(locale, "aiAnswer")}</h2>
          <span className="text-xs text-navy-600 bg-navy-100 px-2 py-0.5 rounded-full">
            {getBasedOnPapers(locale, paperCount)}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-navy-600 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-5 pb-5">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      )}
    </div>
  );
}
