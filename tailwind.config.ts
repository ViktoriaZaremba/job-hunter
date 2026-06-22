import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // Background tokens
        canvas: "#F8F9FB",        // Primary background
        surface: "#FFFFFF",        // Cards
        muted: "#F2F4F7",          // Secondary backgrounds

        // Brand / accent
        ink: {
          DEFAULT: "#264653",      // Deep blue
          50: "#F4F7F8",
          100: "#E3EAEC",
          200: "#B9C7CC",
          300: "#7C949C",
          400: "#4F6D77",
          500: "#264653",
          600: "#1F3A45",
          700: "#172C35",
          800: "#0F1E23",
          900: "#0A1418",
        },
        teal: {
          DEFAULT: "#2A9D8F",      // Muted teal
          50: "#EAF7F5",
          100: "#CFEDE8",
          200: "#9CDCD3",
          300: "#69CABE",
          400: "#43B6A8",
          500: "#2A9D8F",
          600: "#207E73",
          700: "#185F57",
          800: "#10403B",
          900: "#08221F",
        },
        sand: {
          DEFAULT: "#E9C46A",      // Soft beige
          50: "#FBF6E8",
          100: "#F6EDC9",
          200: "#F0DD9A",
          300: "#E9C46A",
          400: "#DBAA3F",
          500: "#B68A2C",
          600: "#8C6A21",
          700: "#634B17",
          800: "#3A2C0E",
          900: "#1F1707",
        },
        clay: {
          DEFAULT: "#E76F51",      // Soft red
          50: "#FBEAE5",
          100: "#F7D2C7",
          200: "#F1A88F",
          300: "#EC8B6E",
          400: "#E76F51",
          500: "#D24F2D",
          600: "#A53D22",
          700: "#7A2D19",
          800: "#4F1D11",
          900: "#280E08",
        },

        // Text tokens
        text: {
          primary: "#1D2939",
          secondary: "#667085",
          muted: "#98A2B3",
        },

        // Borders
        line: "#EAECEF",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        // Very subtle, prefer borders
        soft: "0 1px 2px 0 rgba(16, 24, 40, 0.04)",
        card: "0 1px 3px 0 rgba(16, 24, 40, 0.04), 0 1px 2px 0 rgba(16, 24, 40, 0.03)",
        modal: "0 24px 48px -12px rgba(16, 24, 40, 0.18)",
      },
      fontSize: {
        "display": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "h1": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "h2": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body": ["16px", { lineHeight: "24px" }],
        "caption": ["13px", { lineHeight: "18px" }],
      },
    },
  },
  plugins: [],
};
export default config;
