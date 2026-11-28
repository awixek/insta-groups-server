import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getCategoryCounts } from "@/lib/cached";
import { isFilteredView, NOINDEX_FOLLOW } from "@/lib/seo";
import ListingPage from "@/components/ListingPage";
import { isPlatform, PLATFORMS } from "@/lib/platforms";
import { SITE_NAME } from "@/lib/site";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { platform: string; slug: string };
  searchParams: { search?: string; shuffle?: string; page?: string; sort?: string };
}): Promise<Metadata> {
  if (!isPlatform(params.platform)) return {};
  const cats = await getCategories(params.platform);
  const cat = cats.find((c) => c.slug === params.slug);
  const counts = cat ? await getCategoryCounts(params.platform) : {};

  const label = PLATFORMS[params.platform].label;
  const name = cat?.name ?? params.slug;
  const title = `${name} ${label} groups — random ${name.toLowerCase()} group chats`;
  const description = `Join ${name.toLowerCase()} ${label} groups. All AI-moderated, on ${SITE_NAME}.`;
  const url = `/${params.platform}/category/${params.slug}`;
  // unknown or EMPTY category pages are thin -> keep them out of Google until they have groups
  const empty = !cat || counts[cat.id] === 0;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    ...(empty || isFilteredView(searchParams) ? NOINDEX_FOLLOW : {}),
  };
}

export default function PlatformCategoryPage({
  params,
  searchParams,
}: {
  params: { platform: string; slug: string };
  searchParams: { search?: string; shuffle?: string; page?: string; sort?: string };
}) {
  if (!isPlatform(params.platform)) notFound();
  return <ListingPage platform={params.platform} categorySlug={params.slug} searchParams={searchParams} />;
}
