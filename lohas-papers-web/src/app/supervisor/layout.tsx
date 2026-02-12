import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "監修医について - 上原吉敬 | LOHAS Papers",
  description:
    "LOHAS Papers監修医・上原吉敬（医籍登録番号 第611760号）のプロフィール。新潟大学医歯学総合病院 臨床研修医。医師資格は厚生労働省の医師等資格確認検索にて確認できます。",
  openGraph: {
    title: "監修医について - 上原吉敬, M.D. | LOHAS Papers",
    description:
      "LOHAS Papers監修医・上原吉敬のプロフィールと医師資格情報。厚生労働省の公式検索で確認可能。",
    url: "https://lohas-papers.com/supervisor",
  },
  alternates: {
    canonical: "https://lohas-papers.com/supervisor",
  },
};

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
