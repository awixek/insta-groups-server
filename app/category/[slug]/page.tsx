import { permanentRedirect } from "next/navigation";

// Old v1 URL (before platforms had their own categories). Keep it alive so
// already-indexed links don't 404 — those categories were all Instagram.
export default function LegacyCategoryRedirect({ params }: { params: { slug: string } }) {
  permanentRedirect(`/instagram/category/${params.slug}`);
}
