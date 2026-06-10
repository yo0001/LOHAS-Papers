import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const BASE_URL = "https://lohas-papers.com";
const PAGE_URL = `${BASE_URL}/paper-search-ai`;

export const metadata: Metadata = {
  title: "論文検索AI | PubMed・医学論文をAIで日本語要約 - LOHAS Papers",
  description:
    "LOHAS Papersは、PubMed・Semantic Scholarの医学論文を横断検索し、AIが日本語で要約する論文検索AIです。医師・研修医・医学生の文献検索、EBM確認、英語論文の理解を支援します。",
  keywords: [
    "論文検索AI",
    "論文 検索 AI",
    "AI論文検索",
    "医学論文 AI",
    "PubMed AI検索",
    "文献検索 AI",
    "論文要約AI",
    "英語論文 日本語要約",
    "EBM 文献検索",
  ],
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: "論文検索AI | PubMed・医学論文をAIで日本語要約",
    description:
      "PubMed・Semantic Scholarの医学論文を横断検索し、AIが日本語で要約。医師が作った、医師のための論文検索AI。",
    url: PAGE_URL,
    siteName: "LOHAS Papers",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LOHAS Papers - AI論文検索",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "論文検索AI | LOHAS Papers",
    description:
      "PubMed・Semantic Scholarの医学論文をAIで検索し、日本語で要約します。",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

const useCases = [
  {
    title: "PubMed検索の初動を速くする",
    body: "疾患名、薬剤名、臨床疑問を日本語で入力し、関連する英語論文を横断的に確認できます。",
  },
  {
    title: "英語論文を日本語で把握する",
    body: "タイトル、要旨、臨床的な意味を日本語で整理し、原文確認に進む前の理解を助けます。",
  },
  {
    title: "複数論文の要点を比較する",
    body: "検索結果を個別に読むだけでなく、論文間の共通点や違いを把握しやすくします。",
  },
  {
    title: "EBMの確認を日常業務に寄せる",
    body: "外来、病棟、カンファレンス前に、最新エビデンスの入口を短時間で作れます。",
  },
];

const comparisons = [
  {
    label: "通常の検索エンジン",
    text: "幅広いWebページが見つかる一方で、一次論文や医学的根拠に絞るには追加の確認が必要です。",
  },
  {
    label: "PubMed単体検索",
    text: "医学論文の一次情報に強い反面、英語要旨の読解や複数論文の整理に時間がかかります。",
  },
  {
    label: "LOHAS Papers",
    text: "PubMed・Semantic Scholarを横断し、AIが日本語要約を作ることで、論文探索の入口を短縮します。",
  },
];

const faqItems = [
  {
    question: "論文検索AIとは何ですか？",
    answer:
      "論文データベースを検索し、AIで要約・整理する文献検索支援ツールです。LOHAS Papersでは医学論文を中心に、PubMed・Semantic Scholarの検索と日本語要約を組み合わせています。",
  },
  {
    question: "PubMed検索と何が違いますか？",
    answer:
      "PubMedは医学論文の一次情報を探すための重要なデータベースです。LOHAS Papersはその検索結果を日本語で理解しやすく整理し、複数論文の比較や臨床的な読み取りを支援します。",
  },
  {
    question: "AI要約だけで臨床判断してよいですか？",
    answer:
      "いいえ。AI要約は文献確認の補助です。診療判断では必ず原著論文、ガイドライン、添付文書、専門家の判断を確認してください。",
  },
  {
    question: "医師や医学生以外も使えますか？",
    answer:
      "研究者、看護師、薬剤師、コメディカル、医学生など、医学・医療系の文献を読む人の下調べに使えます。",
  },
];

export default function PaperSearchAIPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "論文検索AI | LOHAS Papers",
      headline: "論文検索AIでPubMed・医学論文を日本語要約",
      url: PAGE_URL,
      inLanguage: "ja",
      description:
        "PubMed・Semantic Scholarの医学論文を横断検索し、AIが日本語で要約する論文検索AIです。",
      isPartOf: {
        "@type": "WebSite",
        name: "LOHAS Papers",
        url: BASE_URL,
      },
      about: [
        "論文検索AI",
        "医学論文検索",
        "PubMed検索",
        "AI論文要約",
        "EBM",
      ],
      reviewedBy: {
        "@type": "Organization",
        name: "LOHAS Inc.",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "ホーム",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "論文検索AI",
          item: PAGE_URL,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="bg-gray-50">
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
            <p className="text-sm font-bold text-navy-400 tracking-wide">
              論文検索AI
            </p>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-bold text-navy-700 leading-tight">
              PubMed・医学論文をAIで検索し、日本語で要約
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-gray-600 leading-relaxed">
              LOHAS Papersは、医師・研修医・医学生のための論文検索AIです。
              PubMedとSemantic Scholarの医学論文を横断検索し、英語論文の要点を日本語で整理します。
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/"
                className="btn-3d inline-flex justify-center px-7 py-3 text-white font-bold rounded-lg"
              >
                論文を検索する
              </Link>
              <Link
                href="/supervisor"
                className="inline-flex justify-center px-7 py-3 rounded-lg border border-gray-200 bg-white text-gray-700 font-bold hover:border-navy-200 hover:text-navy-700 transition-colors"
              >
                医師監修について
              </Link>
            </div>
            <figure className="mt-10 overflow-hidden rounded-lg border border-gray-200 bg-navy-700">
              <Image
                src="/og-image.png"
                alt="LOHAS PapersのAI論文検索サービス概要"
                width={1200}
                height={630}
                priority
                className="w-full h-auto"
              />
            </figure>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              論文検索AIでできること
            </h2>
            <p className="mt-4 max-w-3xl text-gray-600 leading-relaxed">
              文献検索の目的は、論文を大量に集めることではなく、信頼できる根拠を短時間で見つけて理解することです。
              LOHAS Papersは、検索、要約、比較、原文確認への導線をまとめて支援します。
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {useCases.map((item) => (
                <section
                  key={item.title}
                  className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {item.body}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              PubMed検索とAI論文検索の違い
            </h2>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {comparisons.map((item) => (
                <section
                  key={item.label}
                  className="rounded-lg border border-gray-200 bg-white p-5"
                >
                  <h3 className="font-bold text-navy-700">{item.label}</h3>
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                    {item.text}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              医療系の検索で大切にしていること
            </h2>
            <div className="mt-6 max-w-3xl space-y-4 text-gray-600 leading-relaxed">
              <p>
                LOHAS Papersは、AI要約を最終判断ではなく、一次情報にたどり着くための補助として設計しています。
                要約の内容だけで診療判断を完結させず、原著論文やガイドラインを確認できる導線を重視しています。
              </p>
              <p>
                医学・医療領域では、情報の正確性、出典、監修体制、限界の明示が重要です。
                そのため、医師監修ページと利用規約を公開し、AI生成コンテンツの位置づけを明確にしています。
              </p>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/topics"
                className="inline-flex justify-center px-6 py-3 rounded-lg border border-gray-200 bg-white text-gray-700 font-bold hover:border-navy-200 hover:text-navy-700 transition-colors"
              >
                医学研究トピックを見る
              </Link>
              <Link
                href="/legal"
                className="inline-flex justify-center px-6 py-3 rounded-lg border border-gray-200 bg-white text-gray-700 font-bold hover:border-navy-200 hover:text-navy-700 transition-colors"
              >
                利用上の注意を見る
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              論文検索AIについてのよくある質問
            </h2>
            <div className="mt-8 space-y-3">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="rounded-lg border border-gray-200 bg-white"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 font-bold text-gray-900 [&::-webkit-details-marker]:hidden">
                    {item.question}
                  </summary>
                  <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
