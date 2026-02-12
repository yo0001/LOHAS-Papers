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

const BASE_URL = "https://lohas-papers-web.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "LOHAS Papers - AI Academic Paper Search",
  description:
    "Search PubMed & Semantic Scholar simultaneously. AI summarizes academic papers in 8 languages at 3 difficulty levels. Free credits for new users.",
  openGraph: {
    title: "LOHAS Papers - AI Academic Paper Search",
    description:
      "Search PubMed & Semantic Scholar simultaneously. AI summarizes academic papers in 8 languages at 3 difficulty levels.",
    url: BASE_URL,
    siteName: "LOHAS Papers",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "LOHAS Papers" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LOHAS Papers - AI Academic Paper Search",
    description:
      "Search PubMed & Semantic Scholar simultaneously. AI summarizes papers in 8 languages at 3 difficulty levels.",
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
  const jsonLd = {
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
  };

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
