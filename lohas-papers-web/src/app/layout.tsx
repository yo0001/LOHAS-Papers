import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://lohas-papers.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "LOHAS Papers - AI論文検索・多言語要約 | AI Academic Paper Search",
  description:
    "PubMed・Semantic Scholarを同時検索し、AIが8言語・3難易度で論文を要約。医師監修の論文検索プラットフォーム。新規登録で無料クレジット付与。Search PubMed & Semantic Scholar simultaneously with AI summaries in 8 languages.",
  openGraph: {
    title: "LOHAS Papers - AI論文検索・多言語要約",
    description:
      "PubMed・Semantic Scholarを同時検索し、AIが8言語・3難易度で論文を要約。医師監修の論文検索プラットフォーム。",
    url: BASE_URL,
    siteName: "LOHAS Papers",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "LOHAS Papers - AI論文検索" }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LOHAS Papers - AI論文検索・多言語要約",
    description:
      "PubMed・Semantic Scholarを同時検索、AIが8言語・3難易度で論文を要約。医師監修。",
    images: ["/og-image.png"],
    site: "@lohas_inc",
    creator: "@lohas_inc",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "LOHAS Papers",
      url: BASE_URL,
      applicationCategory: "ReferenceApplication",
      operatingSystem: "Web",
      description:
        "AI-powered academic paper search and multilingual summarization platform. Searches PubMed and Semantic Scholar simultaneously.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "JPY",
        description: "Free credits for new users",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${BASE_URL}/results?q={search_term}`,
        "query-input": "required name=search_term",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: "LOHAS Papers - AI論文検索・多言語要約",
      url: BASE_URL,
      inLanguage: "ja",
      about: {
        "@type": "MedicalCondition",
        name: "Medical Literature Search",
      },
      reviewedBy: {
        "@type": "Person",
        name: "上原 吉敬",
        jobTitle: "医師",
        description:
          "AI生成の論文要約を監修する医師。Medical doctor supervising AI-generated paper summaries.",
      },
      lastReviewed: "2026-02-12",
      medicalAudience: {
        "@type": "MedicalAudience",
        audienceType: "Clinician",
      },
    },
  ];

  return (
    <html lang="ja">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <LanguageProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </LanguageProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
