"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import BYOKSettings from "@/components/BYOKSettings";

export default function SettingsPage() {
  const { locale } = useLanguage();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {t(locale, "settings")}
      </h1>
      <BYOKSettings />
    </div>
  );
}
