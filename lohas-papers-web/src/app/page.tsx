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
      {/* Hero — white base + navy accent */}
      <section className="relative overflow-hidden bg-white">
        {/* Subtle accent shapes for depth */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-navy-50/60 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-navy-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative max-w-5xl mx-auto px-4 py-24 sm:py-32 text-center">
          <h1 className="text-4xl sm:text-6xl font-black text-navy-600 leading-tight tracking-tight">
            {t(locale, "heroTitle")}
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto font-medium">
            {t(locale, "heroDescription")}
          </p>

          {/* Trial search bar */}
          <div className="mt-12 max-w-2xl mx-auto">
            <SearchBar onSearch={handleTrialSearch} large />
            <p className="mt-3 text-sm text-gray-400">
              {t(locale, "trialSearchHint")}
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => signInWithGoogle("/")}
              className="btn-3d px-8 py-3.5 text-white font-bold rounded-full"
            >
              {t(locale, "heroCta")}
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-400 font-medium">
            {t(locale, "heroBonus")}
          </p>
        </div>
        {/* Bottom edge shadow for depth */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-navy-200/50 to-transparent" />
      </section>

      {/* How it Works */}
      <section className="py-20 bg-gray-50/80">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-black text-center text-gray-900 tracking-tight">
            {t(locale, "howItWorksTitle")}
          </h2>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-10">
            {[
              { num: "1", title: t(locale, "step1Title"), desc: t(locale, "step1Desc"), icon: "01" },
              { num: "2", title: t(locale, "step2Title"), desc: t(locale, "step2Desc"), icon: "02" },
              { num: "3", title: t(locale, "step3Title"), desc: t(locale, "step3Desc"), icon: "03" },
            ].map((step) => (
              <div key={step.num} className="text-center group">
                <div className="w-16 h-16 mx-auto bg-white rounded-2xl shadow-md shadow-navy-600/10 border border-gray-100 flex items-center justify-center text-lg font-black text-navy-600 group-hover:shadow-lg group-hover:shadow-navy-600/15 group-hover:-translate-y-0.5 transition-all">
                  {step.icon}
                </div>
                <h3 className="mt-5 text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-black text-center text-gray-900 tracking-tight">
            {t(locale, "featuresTitle")}
          </h2>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { title: t(locale, "feature1Title"), desc: t(locale, "feature1Desc"), emoji: "🌐" },
              { title: t(locale, "feature2Title"), desc: t(locale, "feature2Desc"), emoji: "📊" },
              { title: t(locale, "feature3Title"), desc: t(locale, "feature3Desc"), emoji: "🔍" },
              { title: t(locale, "feature4Title"), desc: t(locale, "feature4Desc"), emoji: "🤖" },
            ].map((feat) => (
              <div key={feat.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md shadow-gray-200/60 hover:shadow-xl hover:shadow-navy-600/8 hover:-translate-y-0.5 hover:border-navy-100 transition-all">
                <div className="flex items-start gap-4">
                  <span className="text-2xl">{feat.emoji}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{feat.title}</h3>
                    <p className="mt-2 text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Topics */}
      <section className="py-20 bg-gray-50/80">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {t(locale, "topicsTitle")}
            </h2>
            <Link
              href="/topics"
              className="text-sm font-semibold text-navy-500 hover:text-navy-700 transition-colors"
            >
              {t(locale, "topicsViewAll")} →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredTopics.map((topic) => {
              const categoryLabel = CATEGORY_LABELS[topic.category];
              return (
                <Link
                  key={topic.slug}
                  href={`/topics/${topic.slug}`}
                  className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-navy-200 transition-all"
                >
                  <span className="text-[10px] uppercase tracking-widest text-navy-400 font-bold">
                    {locale === "ja" ? categoryLabel?.ja : categoryLabel?.en}
                  </span>
                  <h3 className="mt-2 font-bold text-gray-900 group-hover:text-navy-600 transition-colors">
                    {locale === "ja" ? topic.title_ja : topic.title_en}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {locale === "ja" ? topic.description_ja : topic.description_en}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-black text-center text-gray-900 tracking-tight">
            {t(locale, "audienceTitle")}
          </h2>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: t(locale, "audience1Title"), desc: t(locale, "audience1Desc"), emoji: "🩺" },
              { title: t(locale, "audience2Title"), desc: t(locale, "audience2Desc"), emoji: "🔬" },
              { title: t(locale, "audience3Title"), desc: t(locale, "audience3Desc"), emoji: "📚" },
              { title: t(locale, "audience4Title"), desc: t(locale, "audience4Desc"), emoji: "👨‍👩‍👧" },
            ].map((aud) => (
              <div key={aud.title} className="text-center p-6 rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-200/60 hover:shadow-xl hover:shadow-navy-600/8 hover:-translate-y-0.5 transition-all">
                <span className="text-3xl">{aud.emoji}</span>
                <h3 className="mt-3 font-bold text-gray-900 text-sm">{aud.title}</h3>
                <p className="mt-2 text-gray-500 text-xs leading-relaxed">{aud.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Physician Supervised */}
      <section className="py-14 bg-gray-50/80 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-2xl px-8 py-5 shadow-sm">
            <div className="w-12 h-12 bg-navy-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              MD
            </div>
            <div className="text-left">
              <p className="text-xs text-navy-400 font-bold uppercase tracking-wide">
                {t(locale, "supervisedBadge")}
              </p>
              <p className="text-sm font-bold text-gray-900">
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
      <section className="relative py-20 bg-navy-600 overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-navy-400/30 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {t(locale, "bottomCta")}
          </h2>
          <p className="mt-4 text-navy-200 font-medium">
            {t(locale, "bottomCtaDesc")}
          </p>
          <button
            onClick={() => signInWithGoogle("/")}
            className="btn-3d-white mt-8 px-8 py-3.5 text-navy-700 font-bold rounded-full"
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
