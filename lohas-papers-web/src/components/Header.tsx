"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import UserMenu from "./UserMenu";
import ModelSelector from "./ModelSelector";
import { getDueCount } from "@/lib/vocabulary-storage";

function VocabularyNavLink() {
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    setDueCount(getDueCount());
  }, []);

  return (
    <>
      {/* Desktop */}
      <Link
        href="/vocabulary"
        className="hidden sm:inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-700 transition-colors relative"
      >
        📚 単語帳
        {dueCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
            {dueCount > 99 ? "99+" : dueCount}
          </span>
        )}
      </Link>
      {/* Mobile */}
      <Link
        href="/vocabulary"
        className="sm:hidden text-gray-600 hover:text-navy-700 transition-colors relative"
        aria-label="マイ単語帳"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        {dueCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[14px] h-[14px] px-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full leading-none">
            {dueCount > 99 ? "99+" : dueCount}
          </span>
        )}
      </Link>
    </>
  );
}

export default function Header() {
  const { locale } = useLanguage();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <Link href="/" className="text-lg sm:text-xl font-bold text-navy-700 hover:text-navy-600 transition-colors shrink-0">
          LOHAS Papers
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="hidden sm:block">
            <ModelSelector />
          </div>
          <VocabularyNavLink />
          <Link
            href="/favorites"
            className="hidden sm:inline text-sm text-gray-600 hover:text-navy-700 transition-colors"
          >
            {t(locale, "favorites")}
          </Link>
          <Link
            href="/favorites"
            className="sm:hidden text-gray-600 hover:text-navy-700 transition-colors"
            aria-label={t(locale, "favorites")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </Link>
          <Link
            href="/settings"
            className="text-gray-600 hover:text-navy-700 transition-colors"
            aria-label={t(locale, "settings")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
