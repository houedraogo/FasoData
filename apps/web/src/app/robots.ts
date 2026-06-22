import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fasodata.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/datasets", "/carte", "/carte-prix", "/recherche", "/developers", "/guide", "/a-propos", "/contact", "/terrain", "/conditions", "/confidentialite"],
        disallow: ["/admin/", "/dashboard/", "/auth/", "/api/", "/_next/", "/mon-espace/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin/", "/dashboard/", "/auth/", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
