"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import CreditBadge from "./CreditBadge";

export default function UserMenu() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!user) {
    return (
      <button
        onClick={() => signInWithGoogle()}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors"
      >
        {t(locale, "login")}
      </button>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "";

  return (
    <div className="flex items-center gap-2" ref={menuRef}>
      <CreditBadge />
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 hover:border-navy-400 transition-colors bg-gray-100"
        >
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={displayName}
              width={32}
              height={32}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-sm font-bold text-gray-600">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t(locale, "account")}
            </Link>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t(locale, "buyCredits")}
            </Link>
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              {t(locale, "logout")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
