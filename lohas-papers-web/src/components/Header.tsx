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
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-emerald-700 hover:text-emerald-600 transition-colors">
          LOHAS Papers
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/favorites"
            className="text-sm text-gray-600 hover:text-emerald-700 transition-colors"
          >
            {t(locale, "favorites")}
          </Link>
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
