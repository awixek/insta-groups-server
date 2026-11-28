import JsonLd from "@/components/JsonLd";
import type { Faq } from "@/lib/seo";

/** Visible, indexable copy + FAQ (with FAQPage structured data) for the bottom of listing pages. */
export default function SeoContent({
  heading,
  paragraphs,
  faqs = [],
}: {
  heading: string;
  paragraphs: string[];
  faqs?: Faq[];
}) {
  return (
    <section className="max-w-6xl mx-auto px-4 mt-14">
      <div className="card !p-6 sm:!p-8">
        <h2 className="text-lg font-bold">{heading}</h2>
        <div className="mt-3 flex flex-col gap-3 text-sm text-muted leading-relaxed max-w-3xl">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {faqs.length > 0 && (
          <>
            <h2 className="text-lg font-bold mt-8">Frequently asked questions</h2>
            <div className="mt-3 divide-y divide-border max-w-3xl">
              {faqs.map((f) => (
                <details key={f.q} className="group py-3">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium text-sm">
                    {f.q}
                    <span className="text-muted transition-transform group-open:rotate-45 text-lg leading-none" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
            <JsonLd
              data={{
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faqs.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              }}
            />
          </>
        )}
      </div>
    </section>
  );
}
