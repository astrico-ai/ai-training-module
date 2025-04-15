import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        favorit: ["var(--font-favorit)", "Arial", "sans serif"],
        inter: ["var(--font-inter)", "Arial", "sans serif"],
        fira: ["var(--font-fira)", "monospace"],
      },
      colors: {
        primary: {
          DEFAULT: '#4B5FFA',
          hover: '#3A4CDF',
          light: '#E8EBFF',
        },
        gray: {
          25: "#FBFBFF",
          200: "#E1E1E5",
          350: "#BBBBBF",
          450: "#949498",
          600: "#616165",
          700: "#4E4E52",
          800: "#2C2C33",
          850: "#1A1A1F",
          900: "#101014",
          1000: "#0B0B0C",
        },
        blue: {
          link: '#4B5FFA',
        },
        green: {
          spring: "#13EF93",
        },
        background: {
          DEFAULT: '#FFFFFF',
          dark: '#F7F9FC',
        },
        text: {
          primary: '#111827',
          secondary: '#6B7280',
        }
      },
    },
  },
  plugins: [],
} satisfies Config;
