"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/lib/i18n";
import SearchBar from "@/components/SearchBar";
import { getSearchHistory, clearSearchHistory } from "@/lib/favorites";
import Link from "next/link";
import { TOPICS, CATEGORY_LABELS } from "@/data/topics";

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
    <div className="mb-6 bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-4 text-center shadow-lg">
      <p className="text-gray-900 font-semibold">{t(locale, "welcomeMessage")}</p>
      <p className="text-gray-500 text-sm mt-1">{t(locale, "welcomeCredits")}</p>
      <button
        onClick={() => setShow(false)}
        className="mt-2 text-xs text-gray-400 hover:text-gray-600"
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
          <h1 className="text-4xl font-bold text-gray-900">LOHAS Papers</h1>
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
                  className="px-3 py-1.5 text-sm text-gray-600 bg-white/60 backdrop-blur border border-white/30 rounded-full hover:border-gray-400 hover:text-gray-900 transition-colors"
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
  const router = useRouter();

  const handleTrialSearch = (query: string) => {
    router.push(`/results?q=${encodeURIComponent(query)}&lang=${locale}`);
  };

  // Show first 12 topics for the landing page
  const featuredTopics = TOPICS.slice(0, 12);

  return (
    <div className="bg-gray-50">
      {/* Hero — monotone + glass */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-100 to-white">
        {/* Decorative glass circles */}
        <div className="absolute top-10 -right-20 w-72 h-72 rounded-full bg-white/40 blur-3xl" />
        <div className="absolute -bottom-10 -left-20 w-96 h-96 rounded-full bg-gray-200/30 blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 py-20 sm:py-28 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
            {t(locale, "heroTitle")}
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            {t(locale, "heroDescription")}
          </p>

          {/* Trial search bar */}
          <div className="mt-10 max-w-2xl mx-auto">
            <SearchBar onSearch={handleTrialSearch} large />
            <p className="mt-3 text-sm text-gray-400">
              {t(locale, "trialSearchHint")}
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => signInWithGoogle("/")}
              className="px-8 py-3 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-all shadow-lg"
            >
              {t(locale, "heroCta")}
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-400 font-medium">
            {t(locale, "heroBonus")}
          </p>
        </div>
      </section>

      {/* How it Works — glass cards */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">
            {t(locale, "howItWorksTitle")}
          </h2>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { num: "1", title: t(locale, "step1Title"), desc: t(locale, "step1Desc"), icon: "01" },
              { num: "2", title: t(locale, "step2Title"), desc: t(locale, "step2Desc"), icon: "02" },
              { num: "3", title: t(locale, "step3Title"), desc: t(locale, "step3Desc"), icon: "03" },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-16 h-16 mx-auto bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg flex items-center justify-center text-lg font-bold text-gray-900">
                  {step.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-gray-500 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — glass cards */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">
            {t(locale, "featuresTitle")}
          </h2>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { title: t(locale, "feature1Title"), desc: t(locale, "feature1Desc") },
              { title: t(locale, "feature2Title"), desc: t(locale, "feature2Desc") },
              { title: t(locale, "feature3Title"), desc: t(locale, "feature3Desc") },
              { title: t(locale, "feature4Title"), desc: t(locale, "feature4Desc") },
            ].map((feat) => (
              <div key={feat.title} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-sm hover:shadow-md transition-shadow">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  {feat.title}
                </span>
                <p className="mt-3 text-gray-500 text-sm">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Topics */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {t(locale, "topicsTitle")}
            </h2>
            <Link
              href="/topics"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t(locale, "topicsViewAll")} &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredTopics.map((topic) => {
              const categoryLabel = CATEGORY_LABELS[topic.category];
              return (
                <Link
                  key={topic.slug}
                  href={`/topics/${topic.slug}`}
                  className="group bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                >
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
                    {locale === "ja" ? categoryLabel?.ja : categoryLabel?.en}
                  </span>
                  <h3 className="mt-2 font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                    {locale === "ja" ? topic.title_ja : topic.title_en}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                    {locale === "ja" ? topic.description_ja : topic.description_en}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">
            {t(locale, "audienceTitle")}
          </h2>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: t(locale, "audience1Title"), desc: t(locale, "audience1Desc") },
              { title: t(locale, "audience2Title"), desc: t(locale, "audience2Desc") },
              { title: t(locale, "audience3Title"), desc: t(locale, "audience3Desc") },
              { title: t(locale, "audience4Title"), desc: t(locale, "audience4Desc") },
            ].map((aud) => (
              <div key={aud.title} className="text-center p-6 rounded-2xl border border-white/30 bg-white/60 backdrop-blur-xl shadow-sm">
                <h3 className="font-semibold text-gray-900 text-sm">{aud.title}</h3>
                <p className="mt-2 text-gray-400 text-xs">{aud.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Physician Supervised */}
      <section className="py-12 bg-white/30 backdrop-blur-sm border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-3 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl px-6 py-4 shadow-sm">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
              MD
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 font-semibold">
                {t(locale, "supervisedBadge")}
              </p>
              <p className="text-sm font-medium text-gray-900">
                {t(locale, "supervisedName")}
              </p>
              <p className="text-xs text-gray-400">
                {t(locale, "supervisedAffiliation")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA — dark glass */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {t(locale, "bottomCta")}
          </h2>
          <p className="mt-3 text-gray-400">
            {t(locale, "bottomCtaDesc")}
          </p>
          <button
            onClick={() => signInWithGoogle("/")}
            className="mt-8 px-8 py-3 bg-white text-gray-900 font-semibold rounded-full hover:bg-gray-100 transition-all shadow-lg"
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
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <AuthenticatedHome /> : <LandingPage />;
}
