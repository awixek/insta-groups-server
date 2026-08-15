import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, KEYWORDS } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Random GC & Group Chats on Instagram`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: KEYWORDS,
  applicationName: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Random GC & Group Chats on Instagram`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Random GC & Group Chats on Instagram`,
    description: SITE_DESCRIPTION,
  },
};

const JSON_LD = `
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "${SITE_NAME}",
  "url": "${SITE_URL}",
  "description": "${SITE_DESCRIPTION}",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "${SITE_URL}/?search={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
`;

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON_LD }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
