"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getDueCount } from "@/lib/vocabulary-storage";

export default function DueReviewBanner() {
  const [dueCount, setDueCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDueCount(getDueCount());
  }, []);

  if (dueCount === 0 || dismissed) return null;

  return (
    <div className="bg-navy-600 text-white rounded-lg px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg shrink-0">🔔</span>
        <p className="text-sm font-medium truncate">
          復習待ちの単語が{" "}
          <span className="font-bold">{dueCount}語</span>{" "}
          あります
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/vocabulary"
          className="px-4 py-1.5 bg-white text-navy-700 text-sm font-semibold rounded-lg hover:bg-navy-50 transition-colors whitespace-nowrap"
        >
          復習する →
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-white/60 hover:text-white transition-colors"
          aria-label="閉じる"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
