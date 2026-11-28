import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { PLATFORM_LIST } from "@/lib/platforms";
import { PUBLIC_STATUSES } from "@/lib/types";
import { anon, getCategories, getCategoryCounts } from "@/lib/cached";

// Regenerated at most every 30 min (no per-request DB work for crawlers)
export const revalidate = 1800;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Only pages worth indexing: no form/account pages, no EMPTY categories.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/editorial`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/faq`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const platformRoutes: MetadataRoute.Sitemap = PLATFORM_LIST.map((p) => ({
    url: `${SITE_URL}/${p}`,
    changeFrequency: "hourly",
    priority: 0.9,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = [];
  for (const p of PLATFORM_LIST) {
    const [cats, counts] = await Promise.all([getCategories(p), getCategoryCounts(p)]);
    for (const c of cats) {
      if ((counts[c.id] ?? 0) > 0) {
        categoryRoutes.push({ url: `${SITE_URL}/${p}/category/${c.slug}`, changeFrequency: "daily", priority: 0.7 });
      }
    }
  }

  // individual group pages (public only, newest 5000)
  const { data: groups } = await anon()
    .from("groups")
    .select("id, created_at")
    .in("status", PUBLIC_STATUSES)
    .order("created_at", { ascending: false })
    .limit(5000);
  const groupRoutes: MetadataRoute.Sitemap = (groups ?? []).map((g) => ({
    url: `${SITE_URL}/g/${g.id}`,
    lastModified: g.created_at,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...platformRoutes, ...categoryRoutes, ...groupRoutes];
}
