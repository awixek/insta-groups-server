import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MobileNav from "@/components/MobileNav";
import Toaster from "@/components/Toaster";
import LoginPrompt from "@/components/LoginPrompt";
import JoinFollowUp from "@/components/JoinFollowUp";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, KEYWORDS } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0c14" },
    { media: "(prefers-color-scheme: light)", color: "#f8f9fc" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Join Random Instagram, Telegram & Discord Groups`,
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
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Join Random Instagram, Telegram & Discord Groups`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Join Random Instagram, Telegram & Discord Groups`,
    description: SITE_DESCRIPTION,
  },
};

const JSON_LD = `
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "${SITE_NAME}",
  "alternateName": ["RandomGC", "randomgc.com"],
  "inLanguage": ["en", "hi"],
  "url": "${SITE_URL}",
  "description": "${SITE_DESCRIPTION}",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "${SITE_URL}/?search={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
`;

// Google Analytics 4 (set NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX in Vercel; empty = off).
// Plain <script> tags in the server-rendered <head>, so they are in the raw page HTML (GA's "Test installation"
// and view-source can see them) and don't depend on client-side hydration. Skipped on /admin.
// trim + strip quotes: a stray space/newline/quote pasted into the Vercel value must not silently disable tracking
const GA_ID = (process.env.NEXT_PUBLIC_GA_ID ?? "").trim().replace(/^["']|["']$/g, "").trim();
const GA_OK = !!GA_ID && /^G-[A-Z0-9]+$/i.test(GA_ID);
const GA_INIT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());if(location.pathname.indexOf('/admin')!==0){gtag('config','${GA_ID}');}`;

const THEME_INIT = `
(function() {
  try {
    var stored = localStorage.getItem('igTheme');
    var theme = stored || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
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
    <html lang="en" className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {GA_OK && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <script dangerouslySetInnerHTML={{ __html: GA_INIT }} />
          </>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON_LD }}
        />
      </head>
      <body className="font-sans pb-16 sm:pb-0">
        {children}
        <MobileNav />
        <Toaster />
        <LoginPrompt />
        <JoinFollowUp />
      </body>
    </html>
  );
}
