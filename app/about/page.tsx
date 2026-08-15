import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-4">About Us</h1>

        <div className="space-y-4 text-sm text-muted leading-relaxed">
          <p>
            Random insta groups is a simple discovery platform built to help people find and
            join Instagram group chats — casual rooms, philosophical GCs, memes, hobby groups,
            and more.
          </p>
          <p>
            Think of us as a bridge: on one side are group owners who want more members for
            their Instagram group chat, and on the other are people who just want to join a
            random, interesting group without hunting around social media for invite links.
            We connect the two.
          </p>
          <p>
            Every group listed here is shared by its owner using a link that&apos;s already
            public on social media — we don&apos;t create, run, or own any of the groups
            themselves. When someone wants to join, they use the invite link to send a request
            directly to that group&apos;s admin, exactly as if they&apos;d found the link
            anywhere else.
          </p>
          <p>
            Every submission is reviewed — first by AI, and by a human whenever the AI isn&apos;t
            confident — to keep the directory clean and spam-free. You can read more about how
            that works on our{" "}
            <a href="/editorial" className="text-accent underline">
              Editorial &amp; Moderation Policy
            </a>{" "}
            page.
          </p>
          <p>
            Have a question, suggestion, or an issue with a listing? We&apos;d love to hear from
            you — see our{" "}
            <a href="/contact" className="text-accent underline">
              Contact Us
            </a>{" "}
            page.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
