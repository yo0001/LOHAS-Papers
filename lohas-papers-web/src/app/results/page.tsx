import type { Metadata } from "next";
import ResultsContent from "./ResultsContent";

interface Props {
  searchParams: Promise<{ q?: string; lang?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q || "";
  const lang = params.lang || "ja";

  if (!query) {
    return {
      title: "LOHAS Papers - 検索結果",
    };
  }

  const titleMap: Record<string, string> = {
    ja: `「${query}」の論文検索結果 - LOHAS Papers`,
    en: `"${query}" Paper Search Results - LOHAS Papers`,
    ko: `"${query}" 논문 검색 결과 - LOHAS Papers`,
    "zh-Hans": `"${query}" 论文搜索结果 - LOHAS Papers`,
    es: `Resultados de "${query}" - LOHAS Papers`,
    "pt-BR": `Resultados de "${query}" - LOHAS Papers`,
    th: `ผลการค้นหา "${query}" - LOHAS Papers`,
    vi: `Kết quả "${query}" - LOHAS Papers`,
  };

  const descMap: Record<string, string> = {
    ja: `「${query}」に関する最新の論文をAIが要約。LOHAS Papersで論文を検索・理解。`,
    en: `AI-summarized papers about "${query}". Search and understand papers with LOHAS Papers.`,
  };

  const title = titleMap[lang] || titleMap.en;
  const description = descMap[lang] || descMap.en;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/api/og?q=${encodeURIComponent(query)}&lang=${lang}`],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?q=${encodeURIComponent(query)}&lang=${lang}`],
    },
  };
}

export default function ResultsPage() {
  return <ResultsContent />;
}
