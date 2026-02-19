import type { MetadataRoute } from "next";
import { TOPICS } from "@/data/topics";

const BASE_URL = "https://lohas-papers.com";

// Specific dates for sitemap accuracy (avoid dynamic new Date() which always shows "today")
const LAST_MAJOR_UPDATE = "2026-02-19"; // Last major site update
const TOPIC_CONTENT_DATE = "2026-02-12"; // Last topic content batch update
const LEGAL_UPDATE_DATE = "2026-02-12"; // Legal page last updated
const PRICING_UPDATE_DATE = "2026-02-01"; // Pricing structure last changed

export default function sitemap(): MetadataRoute.Sitemap {
  const topicEntries: MetadataRoute.Sitemap = TOPICS.map((topic) => ({
    url: `${BASE_URL}/topics/${topic.slug}`,
    lastModified: new Date(TOPIC_CONTENT_DATE),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(LAST_MAJOR_UPDATE),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/topics`,
      lastModified: new Date(TOPIC_CONTENT_DATE),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...topicEntries,
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(PRICING_UPDATE_DATE),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/favorites`,
      lastModified: new Date(LAST_MAJOR_UPDATE),
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/account`,
      lastModified: new Date(LAST_MAJOR_UPDATE),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal`,
      lastModified: new Date(LEGAL_UPDATE_DATE),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/supervisor`,
      lastModified: new Date(LAST_MAJOR_UPDATE),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
