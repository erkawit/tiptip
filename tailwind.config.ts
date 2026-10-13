import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Forest Identity
        forest: {
          950: "#021D16",
          900: "#042F2E",
          850: "#053E33",
          800: "#064E3B",
          700: "#0B664F",
          600: "#0F766E",
          500: "#14B8A6",
          400: "#2DD4BF",
          300: "#5EEAD4",
        },
        // Neon / Accent Emerald
        neon: {
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
        },
        // Obsidian / Deep Zinc for Dark Mode
        obsidian: {
          950: "#050706",
          900: "#090D0C",
          850: "#0F1412",
          800: "#121816",
          750: "#171F1C",
          700: "#1B2421",
          600: "#26322E",
          500: "#3D4E48",
          400: "#62776F",
        },
        // Mint-tinted Clean Slate for Light Mode
        mintlight: {
          50: "#F7FAF8",
          100: "#EDF4F0",
          200: "#E1ECE6",
          300: "#CDE0D6",
          400: "#A9C6B8",
        },
        // VIP / Gold Tier
        ambervip: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-outfit)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        "neon-glow": "0 0 25px -3px rgba(16, 185, 129, 0.4)",
        "neon-glow-lg": "0 0 45px -5px rgba(16, 185, 129, 0.6)",
        "gold-glow": "0 0 25px -3px rgba(245, 158, 11, 0.5)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
      },
      keyframes: {
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
