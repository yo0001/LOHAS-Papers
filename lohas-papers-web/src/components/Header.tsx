"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import UserMenu from "./UserMenu";

export default function Header() {
  const { locale } = useLanguage();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <Link href="/" className="text-lg sm:text-xl font-bold text-navy-700 hover:text-navy-600 transition-colors shrink-0">
          LOHAS Papers
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
