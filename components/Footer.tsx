export default function Footer() {
  return (
    <footer className="max-w-5xl mx-auto px-4 py-10 mt-10 text-center text-sm text-muted border-t border-border">
      <p>InstaGroups AI — AI-moderated discovery, not a popularity contest.</p>
      <p className="mt-1">© {new Date().getFullYear()} InstaGroups AI</p>
    </footer>
  );
}
