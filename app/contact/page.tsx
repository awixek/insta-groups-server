import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Contact Us" };

const CONTACT_EMAIL = "ay5890573@gmail.com";

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-4">Contact Us</h1>

        <div className="space-y-4 text-sm text-muted leading-relaxed">
          <p>
            Got a question, a group removal request, a report, or just some feedback? Email us
            and we&apos;ll get back to you as soon as we can.
          </p>

          <div className="card">
            <p className="text-base text-white/90 font-medium">
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

          <p>You can reach out to us for:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Requesting removal of a group you own</li>
            <li>Reporting a broken invite link or a listing that breaks our guidelines</li>
            <li>General questions about how the site works</li>
            <li>Feedback and suggestions</li>
            <li>Anything related to our Privacy Policy or Terms &amp; Conditions</li>
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
