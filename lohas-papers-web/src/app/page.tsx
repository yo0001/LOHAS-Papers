"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/lib/i18n";
import SearchBar from "@/components/SearchBar";
import { getSearchHistory, clearSearchHistory } from "@/lib/favorites";

function WelcomeBanner() {
  const { locale } = useLanguage();
  const [show, setShow] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("welcome") === "1") {
      setShow(true);
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams]);

  if (!show) return null;

  return (
    <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center animate-in fade-in duration-500">
      <p className="text-emerald-800 font-semibold">{t(locale, "welcomeMessage")}</p>
      <p className="text-emerald-600 text-sm mt-1">{t(locale, "welcomeCredits")}</p>
      <button
        onClick={() => setShow(false)}
        className="mt-2 text-xs text-emerald-500 hover:text-emerald-700"
      >
        {t(locale, "done")}
      </button>
    </div>
  );
}

function AuthenticatedHome() {
  const router = useRouter();
  const { locale } = useLanguage();
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  const handleSearch = (query: string) => {
    router.push(`/results?q=${encodeURIComponent(query)}&lang=${locale}`);
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
      <div className="w-full max-w-2xl space-y-8 -mt-20">
        <WelcomeBanner />
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-emerald-700">LOHAS Papers</h1>
          <p className="text-gray-500 text-sm">
            AI-powered academic paper search & multilingual summarization
          </p>
          <p className="text-gray-400 text-xs">by LOHAS Inc.</p>
        </div>

        <SearchBar onSearch={handleSearch} large />

        {history.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-500">{t(locale, "recentSearches")}</h2>
              <button
                onClick={handleClearHistory}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                {t(locale, "clearHistory")}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(q)}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-full hover:border-emerald-400 hover:text-emerald-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LandingPage() {
  const { locale } = useLanguage();
  const { signInWithGoogle } = useAuth();

  return (
    <div className="bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-5xl mx-auto px-4 py-20 sm:py-28 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">
            {t(locale, "heroTitle")}
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {t(locale, "heroDescription")}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => signInWithGoogle("/")}
              className="px-8 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
            >
              {t(locale, "heroCta")}
            </button>
          </div>
          <p className="mt-3 text-sm text-emerald-600 font-medium">
            {t(locale, "heroBonus")}
          </p>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">
            {t(locale, "howItWorksTitle")}
          </h2>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { num: "1", title: t(locale, "step1Title"), desc: t(locale, "step1Desc"), icon: "🔑" },
              { num: "2", title: t(locale, "step2Title"), desc: t(locale, "step2Desc"), icon: "🔍" },
              { num: "3", title: t(locale, "step3Title"), desc: t(locale, "step3Desc"), icon: "📄" },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center text-2xl">
                  {step.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-gray-600 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">
            {t(locale, "featuresTitle")}
          </h2>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { title: t(locale, "feature1Title"), desc: t(locale, "feature1Desc"), color: "bg-blue-100 text-blue-700" },
              { title: t(locale, "feature2Title"), desc: t(locale, "feature2Desc"), color: "bg-purple-100 text-purple-700" },
              { title: t(locale, "feature3Title"), desc: t(locale, "feature3Desc"), color: "bg-amber-100 text-amber-700" },
              { title: t(locale, "feature4Title"), desc: t(locale, "feature4Desc"), color: "bg-emerald-100 text-emerald-700" },
            ].map((feat) => (
              <div key={feat.title} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${feat.color}`}>
                  {feat.title}
                </span>
                <p className="mt-3 text-gray-600 text-sm">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">
            {t(locale, "audienceTitle")}
          </h2>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: t(locale, "audience1Title"), desc: t(locale, "audience1Desc"), icon: "🩺" },
              { title: t(locale, "audience2Title"), desc: t(locale, "audience2Desc"), icon: "🔬" },
              { title: t(locale, "audience3Title"), desc: t(locale, "audience3Desc"), icon: "📚" },
              { title: t(locale, "audience4Title"), desc: t(locale, "audience4Desc"), icon: "👤" },
            ].map((aud) => (
              <div key={aud.title} className="text-center p-6 rounded-xl border border-gray-100 bg-gray-50">
                <div className="text-3xl">{aud.icon}</div>
                <h3 className="mt-3 font-semibold text-gray-900 text-sm">{aud.title}</h3>
                <p className="mt-2 text-gray-500 text-xs">{aud.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Physician Supervised */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-lg flex-shrink-0">
              🩺
            </div>
            <div className="text-left">
              <p className="text-xs text-emerald-600 font-semibold">
                {t(locale, "supervisedBadge")}
              </p>
              <p className="text-sm font-medium text-gray-900">
                {t(locale, "supervisedName")}
              </p>
              <p className="text-xs text-gray-500">
                {t(locale, "supervisedAffiliation")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-emerald-600">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {t(locale, "bottomCta")}
          </h2>
          <p className="mt-3 text-emerald-100">
            {t(locale, "bottomCtaDesc")}
          </p>
          <button
            onClick={() => signInWithGoogle("/")}
            className="mt-8 px-8 py-3 bg-white text-emerald-700 font-semibold rounded-full hover:bg-gray-100 transition-colors shadow-lg"
          >
            {t(locale, "loginWithGoogle")}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <AuthenticatedHome /> : <LandingPage />;
}
