import type { Metadata } from "next";
import Link from "next/link";
import {
  TOPICS,
  TOPIC_CATEGORIES,
  CATEGORY_LABELS,
  getTopicsByCategory,
} from "@/data/topics";

export const metadata: Metadata = {
  title: "研究トピック - LOHAS Papers",
  description:
    "AIが最新の論文を要約した研究トピックを探索。循環器、内分泌、腫瘍学、神経学など幅広い分野をカバー。",
  openGraph: {
    title: "研究トピック - LOHAS Papers",
    description:
      "AIが最新の論文を要約した研究トピックを探索。",
    images: ["/api/og?title=Medical%20Research%20Topics&type=topic"],
  },
};

export default function TopicsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          医学研究トピック
        </h1>
        <p className="mt-3 text-gray-500 max-w-2xl mx-auto">
          AIが最新論文を要約した医学研究トピックを探索
        </p>
      </div>

      <div className="space-y-12">
        {TOPIC_CATEGORIES.map((category) => {
          const topics = getTopicsByCategory(category);
          if (topics.length === 0) return null;
          const label = CATEGORY_LABELS[category];

          return (
            <section key={category}>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-gray-900 rounded-full" />
                {label?.ja}
                <span className="text-xs text-gray-400 font-normal ml-1">
                  {label?.en}
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map((topic) => (
                  <Link
                    key={topic.slug}
                    href={`/topics/${topic.slug}`}
                    className="group bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                  >
                    <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {topic.title_ja}
                    </h3>
                    <p className="mt-1 text-xs text-gray-400">
                      {topic.title_en}
                    </p>
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                      {topic.description_ja}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-16 text-center">
        <div className="bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            探しているトピックが見つからない？
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            LOHAS Papersで自由に検索して、AIが最新論文を要約します
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-all shadow-lg"
          >
            検索する
          </Link>
        </div>
      </div>
    </div>
  );
}
