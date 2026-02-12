"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";

export default function Footer() {
  const { locale } = useLanguage();

  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} LOHAS Inc. — LOHAS Papers</p>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="hover:text-gray-600 transition-colors">
            {t(locale, "footerPricing")}
          </Link>
          <Link href="/legal" className="hover:text-gray-600 transition-colors">
            {t(locale, "footerLegal")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
