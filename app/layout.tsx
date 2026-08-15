import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InstaGroups AI — Discover Instagram Chat Groups",
  description:
    "The simplest, AI-moderated directory to discover working Instagram chat groups by topic.",
};

const THEME_INIT = `
(function() {
  try {
    var stored = localStorage.getItem('igTheme');
    var theme = stored || 'dark';
    document.documentElement.classList.toggle('light', theme === 'light');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
