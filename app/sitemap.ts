import type { MetadataRoute } from "next";

const LAST_MODIFIED = "2026-05-10";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://app-reveal-studio.yencheng.dev/",
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
