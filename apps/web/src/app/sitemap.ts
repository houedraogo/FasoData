import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fasodata.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl,                          lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${siteUrl}/datasets`,            lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${siteUrl}/carte-prix`,          lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${siteUrl}/carte`,               lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${siteUrl}/recherche`,           lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${siteUrl}/developers`,          lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/guide`,               lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/a-propos`,            lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/contact`,             lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/terrain`,             lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/conditions`,          lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${siteUrl}/confidentialite`,     lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  return staticRoutes;
}
