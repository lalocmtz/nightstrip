import type { MetadataRoute } from "next";

const ORIGIN = "https://nightstrip.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/faq"],
      disallow: ["/api/", "/r/", "/v/"],
    },
    sitemap: `${ORIGIN}/sitemap.xml`,
    host: ORIGIN,
  };
}
