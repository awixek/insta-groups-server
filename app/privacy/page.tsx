import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CONTACT_EMAIL, GRIEVANCE_OFFICER_NAME } from "@/lib/site";

export const metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-1">Privacy Policy</h1>
        <p className="text-xs text-muted mb-6">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="space-y-4 text-sm text-muted leading-relaxed">
          <p>
            This Privacy Policy explains what information Random group chats ("we", "us")
            collects, how we use it, and the choices you have. By using this site, you agree to
            the practices described here.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Information we collect</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <span className="text-white/80">Account info:</span> when you log in with Google,
              we receive your name, email address, and profile picture.
            </li>
            <li>
              <span className="text-white/80">Group submissions:</span> the group name, invite
              link, and description you submit when registering a group.
            </li>
            <li>
              <span className="text-white/80">Activity data:</span> votes, saved groups, and
              reports you make while logged in.
            </li>
          </ul>

          <h2 className="text-fg font-semibold mt-6 mb-1">How we use it</h2>
          <p>
            We use this information to run your account, show your saved groups, apply your
            votes, keep the group ranking fair, run AI/human moderation, and respond to
            support requests.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Third-party services</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Google — for account login (OAuth)</li>
            <li>Supabase — our database and authentication provider</li>
            <li>Groq — used to run AI moderation on submitted groups</li>
            <li>Vercel — our hosting provider</li>
            <li>
              Google AdSense — we may show ads on this site. Google may use cookies to serve
              ads based on your visits to this and other websites. You can manage your ad
              preferences at{" "}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline"
              >
                adssettings.google.com
              </a>
              .
            </li>
          </ul>

          <h2 className="text-fg font-semibold mt-6 mb-1">Cookies</h2>
          <p>
            We use cookies required for login and session management. We also use Google
            Analytics to understand, in aggregate, which pages are visited and how the site is used;
            it sets cookies and collects anonymous usage data such as pages viewed and device type. You can
            block these cookies in your browser settings or with Google&apos;s opt-out add-on. If ads are
            enabled on this site, Google and its partners may also set cookies for ad delivery and
            measurement.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Data retention &amp; deletion</h2>
          <p>
            We keep your data as long as your account is active. You can request deletion of
            your account and associated data at any time by emailing{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Children&apos;s privacy</h2>
          <p>
            This site is not intended for anyone under 13. Users aged 13–17 should use it with a parent or
            guardian&apos;s knowledge. We do not knowingly collect more than the Google login details described above from
            minors, we do not allow adult content, and we do not build profiles of children or target ads at them. If you
            are a parent or guardian and want your child&apos;s data deleted, email us and we will remove it.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Grievance Officer</h2>
          <p>
            Privacy complaints or data requests can be sent to our Grievance Officer: <b>{GRIEVANCE_OFFICER_NAME}</b>,{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline">{CONTACT_EMAIL}</a>. We acknowledge
            requests within 24 hours and aim to resolve them within 15 days.
          </p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Changes to this policy</h2>
          <p>We may update this policy from time to time. Continued use of the site after changes means you accept the updated policy.</p>

          <h2 className="text-fg font-semibold mt-6 mb-1">Contact</h2>
          <p>
            Questions about this policy? Email{" "}
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
