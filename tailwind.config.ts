import type { Config } from "tailwindcss";

// All colours come from CSS variables (see app/globals.css) so the same
// components can wear an Instagram / Telegram / Discord skin and light/dark.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        border: v("border"),
        accent: v("accent"),
        accent2: "#00d2a0",
        muted: v("muted"),
        fg: v("fg"),
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
