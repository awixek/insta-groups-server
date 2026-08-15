import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Editorial & Moderation Policy" };

export default function EditorialPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-4">Editorial &amp; Moderation Policy</h1>

        <div className="space-y-4 text-sm text-muted leading-relaxed">
          <p>
            We keep this directory clean and useful through a two-step review process, and we
            follow Google&apos;s publisher and content policies throughout.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">1. AI review, first</h2>
          <p>
            Every group submitted goes through automated AI review before it ever appears on
            the site. The AI checks the name, description, and category against our
            guidelines.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">2. Human review, when needed</h2>
          <p>
            If the AI isn&apos;t confident about a submission, a human reviewer checks it
            manually before it&apos;s approved.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">3. Zero tolerance for violations</h2>
          <p>
            Anything that breaks our guidelines — spam, illegal content, hate speech, scams, or
            content that doesn&apos;t belong on this platform — is blocked immediately. Spam
            submissions are never allowed.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">4. Removal requests</h2>
          <p>
            If you own a group and want it taken down, use the &quot;Request removal&quot;
            option on your group&apos;s card, or email us at{" "}
            <a href="mailto:ay5890573@gmail.com" className="text-accent underline">
              ay5890573@gmail.com
            </a>
            . Once we confirm the request is legitimate, the listing is removed immediately.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">5. Reporting</h2>
          <p>
            Anyone can report a broken invite link or a listing that seems to violate our
            guidelines using the ⋮ menu on a group card. Reports are reviewed and acted on
            promptly.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
