import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ListingPage from "@/components/ListingPage";
import { isPlatform } from "@/lib/platforms";
import { PLATFORM_SEO, isFilteredView, NOINDEX_FOLLOW } from "@/lib/seo";

export function generateMetadata({
  params,
  searchParams,
}: {
  params: { platform: string };
  searchParams: { search?: string; shuffle?: string; page?: string; sort?: string };
}): Metadata {
  if (!isPlatform(params.platform)) return {};
  const seo = PLATFORM_SEO[params.platform];
  const url = `/${params.platform}`;
  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: url },
    openGraph: { title: seo.title, description: seo.description, url },
    twitter: { title: seo.title, description: seo.description },
    ...(isFilteredView(searchParams) ? NOINDEX_FOLLOW : {}),
  };
}

export default function PlatformPage({
  params,
  searchParams,
}: {
  params: { platform: string };
  searchParams: { search?: string; shuffle?: string; page?: string; sort?: string };
}) {
  if (!isPlatform(params.platform)) notFound();
  return <ListingPage platform={params.platform} searchParams={searchParams} />;
}
