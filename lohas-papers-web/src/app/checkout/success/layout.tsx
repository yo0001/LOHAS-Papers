import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "購入完了 - LOHAS Papers",
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
