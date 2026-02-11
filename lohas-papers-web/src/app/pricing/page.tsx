"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import LoginModal from "@/components/LoginModal";

const ONE_TIME_PLANS = [
  { key: "starter", credits: 6, amount: 600 },
  { key: "standard", credits: 25, amount: 2200, popular: true },
  { key: "premium", credits: 70, amount: 5500 },
];

const SUB_PLANS = [
  { key: "pro", credits: 60, amount: 4980 },
  { key: "lab", credits: 200, amount: 29800 },
  { key: "institutional", credits: 1000, amount: 98000 },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const handlePurchase = async (plan: string) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  const pricePerCredit = (amount: number, credits: number) => {
    return Math.round(amount / credits);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">{t(locale, "pricingTitle")}</h1>
        <p className="text-gray-500">{t(locale, "pricingSubtitle")}</p>
      </div>

      {/* Credit Packs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t(locale, "creditPacks")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ONE_TIME_PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative bg-white rounded-xl border p-6 space-y-4 ${
                plan.popular ? "border-emerald-400 ring-2 ring-emerald-100" : "border-gray-200"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-600 text-white text-xs font-medium rounded-full">
                  {t(locale, "popular")}
                </span>
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-900 capitalize">{t(locale, `plan_${plan.key}`)}</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">{formatPrice(plan.amount)}</p>
                <p className="text-sm text-gray-500">
                  {plan.credits} {t(locale, "creditsUnit")} ({formatPrice(pricePerCredit(plan.amount, plan.credits))}/{t(locale, "perCredit")})
                </p>
              </div>
              <button
                onClick={() => handlePurchase(plan.key)}
                disabled={loadingPlan === plan.key}
                className={`w-full py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  plan.popular
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {loadingPlan === plan.key ? "..." : t(locale, "purchase")}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t(locale, "subscriptionPlans")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUB_PLANS.map((plan) => (
            <div key={plan.key} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 capitalize">{t(locale, `plan_${plan.key}`)}</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatPrice(plan.amount)}
                  <span className="text-sm font-normal text-gray-500">/{t(locale, "month")}</span>
                </p>
                <p className="text-sm text-gray-500">
                  {plan.credits} {t(locale, "creditsPerMonth")} ({formatPrice(pricePerCredit(plan.amount, plan.credits))}/{t(locale, "perCredit")})
                </p>
              </div>
              <button
                onClick={() => handlePurchase(plan.key)}
                disabled={loadingPlan === plan.key}
                className="w-full py-2.5 rounded-lg font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loadingPlan === plan.key ? "..." : t(locale, "subscribe")}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Credit costs */}
      <div className="bg-gray-50 rounded-xl p-6 space-y-3">
        <h2 className="font-semibold text-gray-800">{t(locale, "creditUsage")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex justify-between p-3 bg-white rounded-lg">
            <span className="text-gray-600">{t(locale, "searchButton")}</span>
            <span className="font-medium">1.0 cr</span>
          </div>
          <div className="flex justify-between p-3 bg-white rounded-lg">
            <span className="text-gray-600">{t(locale, "abstract")}</span>
            <span className="font-medium">0.3 cr</span>
          </div>
          <div className="flex justify-between p-3 bg-white rounded-lg">
            <span className="text-gray-600">{t(locale, "fulltextTranslation")}</span>
            <span className="font-medium">3.0 cr</span>
          </div>
        </div>
      </div>

      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} redirectTo="/pricing" />
    </div>
  );
}
