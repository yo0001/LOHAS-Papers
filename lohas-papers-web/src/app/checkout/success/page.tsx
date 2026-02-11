"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";

export default function CheckoutSuccessPage() {
  const { refreshCredits } = useAuth();
  const { locale } = useLanguage();

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">{t(locale, "checkoutSuccess")}</h1>
      <p className="text-gray-500">{t(locale, "checkoutSuccessDesc")}</p>
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
        >
          {t(locale, "startSearching")}
        </Link>
        <Link
          href="/account"
          className="px-6 py-3 text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
        >
          {t(locale, "account")}
        </Link>
      </div>
    </div>
  );
}
