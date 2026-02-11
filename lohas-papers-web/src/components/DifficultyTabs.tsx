"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";

type Difficulty = "expert" | "layperson" | "children";

interface DifficultyTabsProps {
  selected: Difficulty;
  onChange: (d: Difficulty) => void;
}

const DIFFICULTIES: { key: Difficulty; icon: string; labelKey: string }[] = [
  { key: "expert", icon: "\uD83C\uDF93", labelKey: "difficultyExpert" },
  { key: "layperson", icon: "\uD83D\uDC64", labelKey: "difficultyLayperson" },
  { key: "children", icon: "\uD83D\uDE0A", labelKey: "difficultyChildren" },
];

export default function DifficultyTabs({ selected, onChange }: DifficultyTabsProps) {
  const { locale } = useLanguage();

  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {DIFFICULTIES.map(({ key, icon, labelKey }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm transition-all ${
            selected === key
              ? "bg-white text-emerald-700 font-medium shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          <span>{icon}</span>
          <span>{t(locale, labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
