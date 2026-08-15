import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-1">Terms &amp; Conditions</h1>
        <p className="text-xs text-muted mb-6">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="space-y-4 text-sm text-muted leading-relaxed">
          <p>
            By using Random insta groups (&quot;the site&quot;), you agree to these Terms &amp;
            Conditions. Please read them before using the site.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">What this site is</h2>
          <p>
            Random insta groups is a directory that lets people share invite links to Instagram
            group chats — links that are already public on social media — so others can find
            and request to join them. We are not affiliated with, endorsed by, or a part of
            Instagram or Meta. We do not own, run, or control any of the groups listed here;
            each group is owned and managed by its respective admin.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Using the site</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Joining a group is open to everyone and doesn&apos;t require an account.</li>
            <li>An account (Google login) is required to register a group, vote, save, or report a listing.</li>
            <li>You must only submit invite links you have the right to share, and that are already publicly available.</li>
            <li>Spam, duplicate, or misleading submissions are not allowed and will be removed.</li>
            <li>You're responsible for what you post and for your conduct inside any group you join.</li>
          </ul>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Content moderation</h2>
          <p>
            All submissions are reviewed by AI and, when needed, by a human moderator, following
            Google&apos;s content policies. We reserve the right to remove or reject any listing
            that violates our guidelines, at any time and without prior notice. See our{" "}
            <a href="/editorial" className="text-accent underline">
              Editorial &amp; Moderation Policy
            </a>{" "}
            for details.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">No warranty</h2>
          <p>
            Groups listed here are run independently by their owners. We don&apos;t control what
            happens inside a group after you join, and we can&apos;t guarantee the accuracy of
            any listing. You join and interact with groups at your own risk.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Limitation of liability</h2>
          <p>
            To the extent permitted by law, Random insta groups is not liable for any loss or
            damage arising from your use of the site or any group you join through it.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Governing law</h2>
          <p>These terms are governed by the laws of India.</p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Changes to these terms</h2>
          <p>We may update these terms from time to time. Continued use of the site means you accept the updated terms.</p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Contact</h2>
          <p>
            Questions about these terms? Email{" "}
            <a href="mailto:ay5890573@gmail.com" className="text-accent underline">
              ay5890573@gmail.com
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
