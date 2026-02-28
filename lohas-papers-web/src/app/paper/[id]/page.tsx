import type { Metadata } from "next";
import PaperDetailClient from "./PaperDetailClient";
import type { PaperDetailResponse } from "@/lib/api";

export const revalidate = 86400; // 1 day ISR

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchPaperDetail(
  paperId: string,
): Promise<PaperDetailResponse | null> {
  const FASTAPI_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const BACKEND_API_KEY = process.env.BACKEND_API_KEY || "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const fetchHeaders: Record<string, string> = {};
    if (BACKEND_API_KEY) {
      fetchHeaders["X-API-Key"] = BACKEND_API_KEY;
    }

    const encodedId = encodeURIComponent(paperId);
    const res = await fetch(
      `${FASTAPI_URL}/paper/${encodedId}/detail?language=ja`,
      {
        headers: fetchHeaders,
        next: { revalidate: 86400 },
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const paperId = decodeURIComponent(id);
  const detail = await fetchPaperDetail(paperId);

  if (!detail) {
    return {
      title: "Paper Detail - LOHAS Papers",
      description:
        "AI搭載の医学論文検索・翻訳プラットフォーム。最新の医学研究を日本語で読める。",
    };
  }

  const title = detail.title_translated
    ? `${detail.title_translated} - LOHAS Papers`
    : `${detail.title_original} - LOHAS Papers`;

  const description = detail.abstract_original
    ? detail.abstract_original.slice(0, 160)
    : detail.summary
      ? detail.summary.slice(0, 160)
      : `${detail.title_original} - LOHAS Papersで論文を読む`;

  const authors = detail.authors.map((a) => a.name).join(", ");

  return {
    title,
    description,
    alternates: {
      canonical: `/paper/${encodeURIComponent(paperId)}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      ...(detail.authors.length > 0 && {
        authors: [authors],
      }),
      images: [
        `/api/og?title=${encodeURIComponent(detail.title_translated || detail.title_original)}&type=paper`,
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        `/api/og?title=${encodeURIComponent(detail.title_translated || detail.title_original)}&type=paper`,
      ],
    },
  };
}

export default async function PaperDetailPage({ params }: Props) {
  const { id } = await params;
  const paperId = decodeURIComponent(id);
  const detail = await fetchPaperDetail(paperId);

  // JSON-LD for SEO
  const jsonLd = detail
    ? {
        "@context": "https://schema.org",
        "@type": "ScholarlyArticle",
        name: detail.title_original,
        headline: detail.title_translated || detail.title_original,
        ...(detail.abstract_original && {
          description: detail.abstract_original,
        }),
        ...(detail.authors.length > 0 && {
          author: detail.authors.map((a) => ({
            "@type": "Person",
            name: a.name,
            ...(a.affiliation && {
              affiliation: {
                "@type": "Organization",
                name: a.affiliation,
              },
            }),
          })),
        }),
        ...(detail.journal && {
          isPartOf: {
            "@type": "Periodical",
            name: detail.journal,
          },
        }),
        ...(detail.year && { datePublished: String(detail.year) }),
        ...(detail.doi && {
          identifier: {
            "@type": "PropertyValue",
            propertyID: "DOI",
            value: detail.doi,
          },
        }),
        ...(detail.is_open_access && { isAccessibleForFree: true }),
        url: `https://lohas-papers.com/paper/${encodeURIComponent(paperId)}`,
      }
    : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "LOHAS Papers",
        item: "https://lohas-papers.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: detail?.title_translated || detail?.title_original || "Paper",
        item: `https://lohas-papers.com/paper/${encodeURIComponent(paperId)}`,
      },
    ],
  };

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <PaperDetailClient paperId={paperId} initialDetail={detail} />
      </div>
    </>
  );
}
