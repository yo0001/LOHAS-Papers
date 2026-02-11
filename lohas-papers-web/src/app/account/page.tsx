"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import CreditBadge from "@/components/CreditBadge";

interface Transaction {
  id: number;
  amount: number;
  balance_after: number;
  type: string;
  description: string;
  created_at: string;
}

export default function AccountPage() {
  const { user, credits, loading } = useAuth();
  const { locale } = useLanguage();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setTransactions(data);
      });
  }, [user]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-4">
          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="w-12 h-12 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <p className="font-semibold text-gray-900">
              {user.user_metadata?.full_name || user.email}
            </p>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{t(locale, "creditsRemaining")}:</span>
          <CreditBadge />
        </div>
        <div className="flex gap-3">
          <a
            href="/pricing"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            {t(locale, "buyCredits")}
          </a>
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {t(locale, "manageSubscription")}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">{t(locale, "transactionHistory")}</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400">{t(locale, "noTransactions")}</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm text-gray-700">{tx.description || tx.type}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.created_at).toLocaleString(locale)}
                  </p>
                </div>
                <span
                  className={`text-sm font-medium ${
                    tx.amount > 0 ? "text-emerald-600" : "text-gray-600"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount.toFixed(1)} cr
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
