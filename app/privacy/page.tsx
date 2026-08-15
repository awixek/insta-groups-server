import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-1">Privacy Policy</h1>
        <p className="text-xs text-muted mb-6">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="space-y-4 text-sm text-muted leading-relaxed">
          <p>
            This Privacy Policy explains what information Random insta groups ("we", "us")
            collects, how we use it, and the choices you have. By using this site, you agree to
            the practices described here.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Information we collect</h2>
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

          <h2 className="text-white/90 font-semibold mt-6 mb-1">How we use it</h2>
          <p>
            We use this information to run your account, show your saved groups, apply your
            votes, keep the group ranking fair, run AI/human moderation, and respond to
            support requests.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Third-party services</h2>
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

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Cookies</h2>
          <p>
            We use cookies required for login and session management. If ads are enabled on
            this site, Google and its partners may also set cookies for ad delivery and
            measurement.
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Data retention &amp; deletion</h2>
          <p>
            We keep your data as long as your account is active. You can request deletion of
            your account and associated data at any time by emailing{" "}
            <a href="mailto:ay5890573@gmail.com" className="text-accent underline">
              ay5890573@gmail.com
            </a>
            .
          </p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Children&apos;s privacy</h2>
          <p>This site is not directed at children and is not intended for use by anyone under 13.</p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Changes to this policy</h2>
          <p>We may update this policy from time to time. Continued use of the site after changes means you accept the updated policy.</p>

          <h2 className="text-white/90 font-semibold mt-6 mb-1">Contact</h2>
          <p>
            Questions about this policy? Email{" "}
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
