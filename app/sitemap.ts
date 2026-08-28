import type { MetadataRoute } from "next";

const ORIGIN = "https://nightstrip.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: ORIGIN, lastModified, changeFrequency: "daily", priority: 1 },
    {
      url: `${ORIGIN}/faq`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
