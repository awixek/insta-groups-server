export default function Footer() {
  const links = [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact Us" },
    { href: "/editorial", label: "Editorial Policy" },
    { href: "/faq", label: "FAQ" },
    { href: "/feedback", label: "Review & Suggestions" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms & Conditions" },
  ];

  return (
    <footer className="max-w-5xl mx-auto px-4 py-10 mt-10 text-center text-sm text-muted border-t border-border">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-4">
        {links.map((l) => (
          <a key={l.href} href={l.href} className="hover:text-white/80">
            {l.label}
          </a>
        ))}
      </nav>
      <p>Random insta groups — AI-moderated discovery, not a popularity contest.</p>
      <p className="mt-1">© {new Date().getFullYear()} Random insta groups</p>
    </footer>
  );
}
