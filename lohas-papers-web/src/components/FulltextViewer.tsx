"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import { type FulltextSection } from "@/lib/api";

interface FulltextViewerProps {
  sections: FulltextSection[];
}

export default function FulltextViewer({ sections }: FulltextViewerProps) {
  const { locale } = useLanguage();
  const [showOriginal, setShowOriginal] = useState<Record<number, boolean>>({});

  const toggleOriginal = (index: number) => {
    setShowOriginal((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-6">
      {sections.map((section, i) => (
        <div key={i} className="border-b border-gray-100 pb-6 last:border-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{section.section_name}</h3>
            <button
              onClick={() => toggleOriginal(i)}
              className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {showOriginal[i] ? t(locale, "abstractTranslated") : t(locale, "fulltextShowOriginal")}
            </button>
          </div>
          <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
            {showOriginal[i] ? section.original : section.translated || section.original}
          </div>
        </div>
      ))}
    </div>
  );
}
