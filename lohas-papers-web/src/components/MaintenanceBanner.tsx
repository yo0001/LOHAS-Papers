"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";

/**
 * Maintenance banner — controlled by NEXT_PUBLIC_MAINTENANCE_MODE env var.
 * Set to "1" (or any truthy value) to show, remove/empty to hide.
 * Message text comes from i18n (maintenanceBanner key) for each locale.
 */
export default function MaintenanceBanner() {
  const enabled = process.env.NEXT_PUBLIC_MAINTENANCE_MODE;
  const { locale } = useLanguage();

  if (!enabled) return null;

  const message = t(locale, "maintenanceBanner");
  const settingsLabel = locale === "ja" ? "設定画面へ →" : "Go to Settings →";

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
      <div className="flex items-center justify-center gap-2 text-sm text-amber-800">
        <span className="text-base">🔑</span>
        <p className="font-medium">
          {message}{" "}
          <Link href="/settings" className="underline hover:text-amber-900 font-bold">
            {settingsLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
