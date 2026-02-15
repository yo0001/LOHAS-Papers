import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "監修について | LOHAS Papers",
  description:
    "LOHAS Papersの医師監修体制について。AI生成の論文要約は、医師による品質管理のもとで提供されています。",
  openGraph: {
    title: "監修について | LOHAS Papers",
    description:
      "LOHAS Papersの医師監修体制とAI要約の品質管理について。",
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
