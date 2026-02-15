"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import UserMenu from "./UserMenu";
import ModelSelector from "./ModelSelector";

export default function Header() {
  const { locale } = useLanguage();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <Link href="/" className="text-lg sm:text-xl font-bold text-navy-700 hover:text-navy-600 transition-colors shrink-0">
          LOHAS Papers
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <ModelSelector />
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
