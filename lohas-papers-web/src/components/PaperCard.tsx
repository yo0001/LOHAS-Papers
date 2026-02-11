"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import { type PaperResult, getSummaryForLocale } from "@/lib/api";
import EvidenceBadge from "./EvidenceBadge";

interface PaperCardProps {
  paper: PaperResult;
}

export default function PaperCard({ paper }: PaperCardProps) {
  const { locale } = useLanguage();
  const summary = getSummaryForLocale(paper.summary, locale);
  const displayTitle = paper.title_translated || paper.title;

  return (
    <Link
      href={`/paper/${encodeURIComponent(paper.id)}?lang=${locale}`}
      className="block bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all p-5"
    >
      <div className="space-y-2">
        <h3 className="font-medium text-gray-900 leading-snug">
          {displayTitle}
        </h3>
        {paper.title_translated && (
          <p className="text-xs text-gray-400 line-clamp-1">{paper.title}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {paper.authors.length > 0 && (
            <span>{paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? " et al." : ""}</span>
          )}
          {paper.journal && <span className="text-gray-400">|</span>}
          {paper.journal && <span>{paper.journal}</span>}
          {paper.year && <span className="text-gray-400">|</span>}
          {paper.year && <span>{paper.year}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <EvidenceBadge level={paper.evidence_level} />
          {paper.is_open_access && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {t(locale, "openAccess")}
            </span>
          )}
          {paper.citation_count > 0 && (
            <span className="text-xs text-gray-500">
              {t(locale, "citations")}: {paper.citation_count}
            </span>
          )}
        </div>

        {summary && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{summary}</p>
        )}
      </div>
    </Link>
  );
}
