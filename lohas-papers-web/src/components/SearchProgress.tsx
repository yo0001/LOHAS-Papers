"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";

export default function SearchProgress() {
  const { locale } = useLanguage();
  const [phase, setPhase] = useState(0);

  const phases = [
    t(locale, "searchPhase1"),
    t(locale, "searchPhase2"),
    t(locale, "searchPhase3"),
    t(locale, "searchPhase4"),
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 2000),
      setTimeout(() => setPhase(2), 5000),
      setTimeout(() => setPhase(3), 8000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-navy-200" />
        <div className="absolute inset-0 rounded-full border-4 border-navy-600 border-t-transparent animate-spin" />
      </div>
      <div className="space-y-3 text-center">
        {phases.map((text, i) => (
          <p
            key={i}
            className={`text-sm transition-all duration-500 ${
              i <= phase ? "text-navy-700 opacity-100" : "text-gray-400 opacity-50"
            } ${i === phase ? "font-medium" : ""}`}
          >
            {i < phase ? "\u2713 " : i === phase ? "" : ""}{text}
          </p>
        ))}
      </div>
    </div>
  );
}
