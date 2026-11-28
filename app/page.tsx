import type { Metadata } from "next";
import ListingPage from "@/components/ListingPage";
import { isFilteredView, NOINDEX_FOLLOW } from "@/lib/seo";

type SP = { search?: string; shuffle?: string; page?: string; sort?: string };

export function generateMetadata({ searchParams }: { searchParams: SP }): Metadata {
  return { alternates: { canonical: "/" }, ...(isFilteredView(searchParams) ? NOINDEX_FOLLOW : {}) };
}

export default function HomePage({ searchParams }: { searchParams: SP }) {
  return <ListingPage searchParams={searchParams} />;
}
