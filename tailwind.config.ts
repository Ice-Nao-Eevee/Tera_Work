import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#fcf8f2",
          bgSoft: "#f3e8d6",
          red: "#d97706",
          redHover: "#b45309",
          dark: "#2a1a15",
          bronze: "#8b5a2b",
          gold: "#ca8a04",
          olive: "#15803d",
          creamCard: "#ffffff",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        pill: "9999px",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(42, 26, 21, 0.06)",
        card: "0 4px 20px rgba(42, 26, 21, 0.04)",
        floating: "0 10px 40px rgba(42, 26, 21, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
