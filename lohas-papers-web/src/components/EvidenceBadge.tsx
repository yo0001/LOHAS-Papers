"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";

interface EvidenceBadgeProps {
  level?: string | null;
}

export default function EvidenceBadge({ level }: EvidenceBadgeProps) {
  const { locale } = useLanguage();

  if (!level) return null;

  const normalized = level.toLowerCase();

  let label: string;
  let colorClass: string;

  if (normalized.includes("high") || normalized === "i" || normalized === "1") {
    label = t(locale, "evidenceHigh");
    colorClass = "bg-green-100 text-green-800";
  } else if (normalized.includes("moderate") || normalized === "ii" || normalized === "2") {
    label = t(locale, "evidenceModerate");
    colorClass = "bg-yellow-100 text-yellow-800";
  } else {
    label = t(locale, "evidenceLow");
    colorClass = "bg-gray-100 text-gray-700";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
