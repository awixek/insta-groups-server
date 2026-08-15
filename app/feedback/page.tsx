import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Review & Suggestions" };

const CONTACT_EMAIL = "ay5890573@gmail.com";
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Feedback for Random insta groups"
)}`;

export default function FeedbackPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-4">Review &amp; Suggestions</h1>

        <div className="space-y-4 text-sm text-muted leading-relaxed">
          <p>
            Liked something? Found a bug? Have an idea for a feature or a category we should
            add? We read every message — send it our way.
          </p>

          <div className="card">
            <a href={MAILTO} className="btn-primary inline-block">
              ✉️ Send us your feedback
            </a>
            <p className="mt-3 text-xs">
              or email us directly at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
