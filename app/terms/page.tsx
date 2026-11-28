import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CONTACT_EMAIL, GRIEVANCE_OFFICER_NAME } from "@/lib/site";

export const metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-1">Terms &amp; Conditions</h1>
        <p className="text-xs text-muted mb-6">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="space-y-4 text-sm text-muted leading-relaxed">
          <p>
            By using Random group chats (&quot;the site&quot;), you agree to these Terms &amp;
            Conditions. Please read them before using the site.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">What this site is</h2>
          <p>
            Random group chats is a directory that lets people share invite links to Instagram,
            Telegram and Discord group chats — links that are already public — so others can find
            and request to join them. We are not affiliated with, endorsed by, or a part of
            Instagram, Meta, Telegram or Discord. We do not own, run, or control any of the groups listed here;
            each group is owned and managed by its respective admin.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Using the site</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Joining a group is open to everyone and doesn&apos;t require an account.</li>
            <li>An account (Google login) is required to register a group, vote, save, or report a listing.</li>
            <li>You must only submit invite links you have the right to share, and that are already publicly available.</li>
            <li>Spam, duplicate, or misleading submissions are not allowed and will be removed.</li>
            <li>You're responsible for what you post and for your conduct inside any group you join.</li>
            <li>
              This is a family-friendly directory. Adult / 18+ content, nudity, sexual content, content that involves
              or endangers minors, hate, harassment, scams, profanity in names, and listings that publish other
              people&apos;s personal details (usernames, phone numbers, emails) are not allowed and are removed.
            </li>
          </ul>

          <h2 className="text-fg font-semibold mt-6 mb-1">Age &amp; safety</h2>
          <p>
            You must be at least 13 years old to use the site, and if you are under 18 you should use it with the
            knowledge of a parent or guardian. Never share personal details (phone number, address, school, photos)
            with strangers in any group you join, and leave any group that makes you uncomfortable. If anyone
            asks you for personal photos or makes you feel unsafe, tell a trusted adult and report the group using ⋮ →
            &quot;Report: inappropriate / spam&quot;.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Content moderation</h2>
          <p>
            All submissions are reviewed by AI and, when needed, by a human moderator, following
            Google&apos;s content policies. We reserve the right to remove or reject any listing
            that violates our guidelines, at any time and without prior notice. See our{" "}
            <a href="/editorial" className="text-accent underline">
              Editorial &amp; Moderation Policy
            </a>{" "}
            for details.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Reporting &amp; takedown</h2>
          <p>
            Any listing can be reported from the ⋮ menu on its card, or by email to {CONTACT_EMAIL}. Reports of
            illegal content, child-safety concerns or impersonation are looked at first and the listing is hidden while
            we review it. Content involving the sexual exploitation of children should also be reported to the
            National Cyber Crime Reporting Portal (cybercrime.gov.in) or the helpline 1930.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Grievance Officer</h2>
          <p>
            In line with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021,
            complaints can be sent to our Grievance Officer: <b>{GRIEVANCE_OFFICER_NAME}</b>, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline">{CONTACT_EMAIL}</a>. We acknowledge
            complaints within 24 hours and aim to resolve them within 15 days.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">No warranty</h2>
          <p>
            Groups listed here are run independently by their owners. We don&apos;t control what
            happens inside a group after you join, and we can&apos;t guarantee the accuracy of
            any listing. You join and interact with groups at your own risk.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Limitation of liability</h2>
          <p>
            To the extent permitted by law, Random group chats is not liable for any loss or
            damage arising from your use of the site or any group you join through it.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Governing law</h2>
          <p>These terms are governed by the laws of India.</p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Changes to these terms</h2>
          <p>We may update these terms from time to time. Continued use of the site means you accept the updated terms.</p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Contact</h2>
          <p>
            Questions about these terms? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
