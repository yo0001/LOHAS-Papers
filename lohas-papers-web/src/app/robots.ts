import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/ai/", "/api/stripe/", "/api/credits", "/auth/"],
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/ai/", "/api/stripe/", "/api/credits", "/auth/"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/ai/", "/api/stripe/", "/api/credits", "/auth/"],
      },
    ],
    sitemap: "https://lohas-papers.com/sitemap.xml",
  };
}
