import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "FAQ" };

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is Random insta groups?",
    a: "A directory where people can share and discover Instagram group chat invite links — casual rooms, philosophical GCs, memes, hobby groups, and more.",
  },
  {
    q: "Is this an official Instagram or Meta product?",
    a: "No. We're an independent platform, not affiliated with Instagram or Meta.",
  },
  {
    q: "Do I need to log in to join a group?",
    a: "No. Joining any group is free and open to everyone — just tap Join, no account needed.",
  },
  {
    q: "Why do some actions ask me to log in?",
    a: "Registering a new group, upvoting/downvoting, saving a group, requesting removal, and reporting a listing all require a Google login — mainly to keep those actions accountable and spam-free.",
  },
  {
    q: "How do I register my group?",
    a: (
      <>
        Tap &quot;+ Register your group&quot; on the homepage, log in, and submit your group
        name, invite link, and description. It goes through AI (and human, if needed) review
        before it goes live.
      </>
    ),
  },
  {
    q: "How does moderation work?",
    a: (
      <>
        Every submission is checked by AI first, with a human reviewer stepping in when the AI
        isn&apos;t confident. See our{" "}
        <a href="/editorial" className="text-accent underline">
          Editorial &amp; Moderation Policy
        </a>{" "}
        for the full process.
      </>
    ),
  },
  {
    q: "How do I get my group removed?",
    a: (
      <>
        Use the &quot;Request removal&quot; option in the ⋮ menu on your group&apos;s card, or
        email{" "}
        <a href="mailto:ay5890573@gmail.com" className="text-accent underline">
          ay5890573@gmail.com
        </a>
        . It&apos;s removed immediately once confirmed.
      </>
    ),
  },
  {
    q: "Is it safe to share my group's link here?",
    a: "We only accept invite links that are already public on social media — we don't ask for anything private. You stay in control of your group at all times as its owner/admin.",
  },
  {
    q: "How do I report a broken link or a rule-breaking group?",
    a: "Tap the ⋮ menu on any group card and choose Report.",
  },
  {
    q: "Who do I contact for help?",
    a: (
      <>
        Email us at{" "}
        <a href="mailto:ay5890573@gmail.com" className="text-accent underline">
          ay5890573@gmail.com
        </a>{" "}
        — see the{" "}
        <a href="/contact" className="text-accent underline">
          Contact Us
        </a>{" "}
        page.
      </>
    ),
  },
];

export default function FAQPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-4">Frequently Asked Questions</h1>

        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <div key={i} className="card">
              <p className="font-medium text-white/90 mb-1">{item.q}</p>
              <p className="text-sm text-muted leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
