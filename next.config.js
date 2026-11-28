/** @type {import('next').NextConfig} */

// Security headers for every response.
//  - frame-ancestors 'none' / X-Frame-Options: stops other sites from framing us (clickjacking on vote / report / join buttons)
//  - the CSP is deliberately minimal (no script-src) so it can't break Next.js inline scripts or AdSense;
//    tighten it later with nonces if you want a strict script policy.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
];

const nextConfig = {
  poweredByHeader: false,
  // The app does not use next/image, so the image optimizer (a past source of DoS / cache advisories)
  // is switched off completely instead of being left open to every *.supabase.co project.
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
