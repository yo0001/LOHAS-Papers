import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "料金プラン - LOHAS Papers | Pricing",
  description:
    "LOHAS Papersの料金プラン。クレジットパック（600円〜）または月額プラン（4,980円〜）で論文検索・AI要約をご利用いただけます。Pricing plans for LOHAS Papers AI-powered academic paper search.",
  openGraph: {
    title: "料金プラン - LOHAS Papers",
    description: "クレジットパックまたは月額プランで論文検索・AI要約をご利用ください。",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
