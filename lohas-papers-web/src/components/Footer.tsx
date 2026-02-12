"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";

export default function Footer() {
  const { locale } = useLanguage();

  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col items-center gap-3 text-xs text-gray-400">
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link href="/topics" className="hover:text-gray-600 transition-colors">
              {t(locale, "footerTopics")}
            </Link>
            <span className="text-gray-300">·</span>
            <Link href="/pricing" className="hover:text-gray-600 transition-colors">
              {t(locale, "footerPricing")}
            </Link>
            <span className="text-gray-300">·</span>
            <Link href="/legal#terms" className="hover:text-gray-600 transition-colors">
              Terms of Service
            </Link>
            <span className="text-gray-300">·</span>
            <Link href="/legal#privacy" className="hover:text-gray-600 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-gray-300">·</span>
            <Link href="/legal#refund" className="hover:text-gray-600 transition-colors">
              Refund Policy
            </Link>
            <span className="text-gray-300">·</span>
            <Link href="/legal" className="hover:text-gray-600 transition-colors">
              {t(locale, "footerLegal")}
            </Link>
          </div>
          <p>{t(locale, "footerSupervised")} · tatsuaki.lohas@gmail.com</p>
          <p>&copy; {new Date().getFullYear()} LOHAS Inc.</p>
        </div>
      </div>
    </footer>
  );
}
