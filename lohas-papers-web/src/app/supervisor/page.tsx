"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import Script from "next/script";

const content = {
  ja: {
    title: "医師監修について",
    description:
      "LOHAS Papersは、日本の医師免許を持つ医師の監修のもとで運営されています。",
    supervisionTitle: "監修方針",
    supervisionPoints: [
      "AI要約の医学的正確性の確認",
      "エビデンスレベル評価の妥当性チェック",
      "一般ユーザーへの分かりやすさと正確性の両立",
      "最新のガイドライン・エビデンスとの整合性確認",
    ],
    qualityTitle: "品質管理体制",
    qualityDescription:
      "すべてのAI生成コンテンツは、医学的正確性の観点から医師による監修を受けています。原文へのリンクも常に提供し、ユーザーが一次情報を確認できるようにしています。",
    disclaimer:
      "本サービスは医療アドバイスを提供するものではありません。健康上の判断は必ず担当医にご相談ください。",
  },
  en: {
    title: "Medical Supervision",
    description:
      "LOHAS Papers is operated under the supervision of a physician licensed in Japan.",
    supervisionTitle: "Supervision Policy",
    supervisionPoints: [
      "Verification of medical accuracy in AI-generated summaries",
      "Validation of evidence level assessments",
      "Ensuring clarity and accuracy for general users",
      "Alignment with latest guidelines and evidence",
    ],
    qualityTitle: "Quality Assurance",
    qualityDescription:
      "All AI-generated content is reviewed by a physician for medical accuracy. Direct links to original papers are always provided so users can verify primary sources.",
    disclaimer:
      "This service does not provide medical advice. Always consult your physician for health-related decisions.",
  },
};

type ContentKey = keyof typeof content;

function getContent(locale: string) {
  if (locale in content) return content[locale as ContentKey];
  return content.en;
}

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "LOHAS Inc.",
  url: "https://lohas-papers.com",
  description:
    "Physician-supervised AI-powered academic paper search and summarization platform.",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "ホーム",
      item: "https://lohas-papers.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "医師監修について",
      item: "https://lohas-papers.com/supervisor",
    },
  ],
};

export default function SupervisorPage() {
  const { locale } = useLanguage();
  const c = getContent(locale);

  return (
    <>
      <Script
        id="org-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <Script
        id="breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <h1 className="text-3xl font-bold text-navy-900 mb-2 font-display">
          {c.title}
        </h1>
        <div className="h-1 w-16 bg-navy-600 rounded mb-8" />

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-navy-100 flex items-center justify-center text-3xl flex-shrink-0">
              🩺
            </div>
            <div>
              <h2 className="text-2xl font-bold text-navy-900">LOHAS Inc.</h2>
              <p className="text-navy-600 mt-2">{c.description}</p>
            </div>
          </div>
        </div>

        {/* Supervision Policy */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 mb-8">
          <h3 className="text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
            📐 {c.supervisionTitle}
          </h3>
          <ul className="space-y-3">
            {c.supervisionPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-navy-600 mt-0.5">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Quality Assurance */}
        <section className="bg-navy-50 rounded-2xl border border-navy-200 p-8 mb-8">
          <h3 className="text-xl font-bold text-navy-900 mb-3 flex items-center gap-2">
            ✅ {c.qualityTitle}
          </h3>
          <p className="text-gray-700">{c.qualityDescription}</p>
        </section>

        {/* Disclaimer */}
        <div className="text-center text-sm text-gray-400 border-t border-gray-100 pt-6">
          {c.disclaimer}
        </div>
      </div>
    </>
  );
}
