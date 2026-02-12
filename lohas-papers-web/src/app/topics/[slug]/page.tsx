import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  TOPICS,
  getTopicBySlug,
  getRelatedTopics,
  CATEGORY_LABELS,
} from "@/data/topics";

export const revalidate = 604800; // 7 days

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return TOPICS.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) return { title: "Not Found" };

  const title = `${topic.title_ja} - LOHAS Papers`;
  const description = topic.description_ja;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        `/api/og?title=${encodeURIComponent(topic.title_en)}&type=topic`,
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        `/api/og?title=${encodeURIComponent(topic.title_en)}&type=topic`,
      ],
    },
  };
}

async function fetchTopicData(queryEn: string) {
  const FASTAPI_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${FASTAPI_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: queryEn,
        language: "ja",
        page: 1,
        per_page: 5,
        sort_by: "relevance",
        filters: {},
      }),
      next: { revalidate: 604800 },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);

  if (!topic) notFound();

  const data = await fetchTopicData(topic.query_en);
  const relatedTopics = getRelatedTopics(slug, 4);
  const categoryLabel = CATEGORY_LABELS[topic.category];

  // JSON-LD for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: topic.title_ja,
    description: topic.description_ja,
    url: `https://lohas-papers.com/topics/${slug}`,
    inLanguage: "ja",
    about: {
      "@type": "MedicalCondition",
      name: topic.title_en,
    },
    reviewedBy: {
      "@type": "Person",
      name: "上原 吉敬",
      jobTitle: "医師",
    },
    lastReviewed: new Date().toISOString().split("T")[0],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/topics"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Topics
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-xs uppercase tracking-widest text-gray-400 font-medium">
              {categoryLabel?.en}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            {topic.title_ja}
          </h1>
          <p className="mt-2 text-sm text-gray-400">{topic.title_en}</p>
          <p className="mt-4 text-gray-500">{topic.description_ja}</p>
        </div>

        {/* AI Summary */}
        {data?.ai_summary?.text && (
          <div className="mb-8 bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-900">AI Summary</h2>
              {data.total_results && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {data.total_results} papers
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {data.ai_summary.text}
            </p>
          </div>
        )}

        {/* Papers */}
        {data?.papers && data.papers.length > 0 && (
          <div className="mb-10 space-y-4">
            {data.papers.map(
              (paper: {
                id: string;
                title: string;
                title_translated?: string;
                authors: string[];
                journal?: string;
                year?: number;
                citation_count: number;
                is_open_access: boolean;
              }) => (
                <div
                  key={paper.id}
                  className="bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-sm"
                >
                  <h3 className="font-medium text-gray-900 leading-snug">
                    {paper.title_translated || paper.title}
                  </h3>
                  {paper.title_translated && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                      {paper.title}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-2">
                    {paper.authors?.length > 0 && (
                      <span>
                        {paper.authors.slice(0, 3).join(", ")}
                        {paper.authors.length > 3 ? " et al." : ""}
                      </span>
                    )}
                    {paper.journal && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span>{paper.journal}</span>
                      </>
                    )}
                    {paper.year && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span>{paper.year}</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {paper.is_open_access && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Open Access
                      </span>
                    )}
                    {paper.citation_count > 0 && (
                      <span className="text-xs text-gray-400">
                        Citations: {paper.citation_count}
                      </span>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mb-12 text-center">
          <Link
            href={`/results?q=${encodeURIComponent(topic.query_en)}&lang=ja`}
            className="btn-3d inline-flex items-center gap-2 px-8 py-3 text-white font-bold rounded-full"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            LOHAS Papersで検索する
          </Link>
        </div>

        {/* Related Topics */}
        {relatedTopics.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              関連トピック
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedTopics.map((related) => {
                const relCat = CATEGORY_LABELS[related.category];
                return (
                  <Link
                    key={related.slug}
                    href={`/topics/${related.slug}`}
                    className="group bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                  >
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
                      {relCat?.en}
                    </span>
                    <h3 className="mt-2 font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {related.title_ja}
                    </h3>
                    <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                      {related.description_ja}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
