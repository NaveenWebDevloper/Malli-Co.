import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#10264B", // Navy Primary
          50: "#EEF2F8",
          100: "#D7E1EE",
          200: "#B0C4DD",
          300: "#88A6CB",
          400: "#4D76AB",
          500: "#2B5288",
          600: "#1C3E6D",
          700: "#10264B",
          800: "#0B1B36",
          900: "#071122",
        },
        navy: {
          DEFAULT: "#10264B",
          50: "#EEF2F8",
          100: "#D7E1EE",
          200: "#B0C4DD",
          300: "#88A6CB",
          400: "#4D76AB",
          500: "#2B5288",
          600: "#1C3E6D",
          700: "#10264B",
          800: "#0B1B36",
          900: "#071122",
        },
        accent: {
          DEFAULT: "#F5B817", // Gold Accent
          50: "#FEF9EC",
          100: "#FDF1CF",
          200: "#FBE39F",
          300: "#F9D46F",
          400: "#F7C63F",
          500: "#F5B817",
          600: "#D39B0A",
          700: "#A37608",
          800: "#735306",
          900: "#453203",
        },
        gold: {
          DEFAULT: "#F5B817",
          50: "#FEF9EC",
          100: "#FDF1CF",
          200: "#FBE39F",
          300: "#F9D46F",
          400: "#F7C63F",
          500: "#F5B817",
          600: "#D39B0A",
          700: "#A37608",
          800: "#735306",
          900: "#453203",
        },
        cream: {
          50: "#FDFCF9",
          100: "#FBF9F5",
          200: "#F4EFE6",
          300: "#EAE3D4",
          400: "#DDD4C1",
          500: "#C6B99E",
          800: "#4D4638",
          900: "#2B2720",
        },
      },
      fontFamily: {
        sans: ["Montserrat", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        montserrat: ["Montserrat", "sans-serif"],
        serif: ["Montserrat", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      gridTemplateColumns: {
        // 12-Column Desktop Grid
        "12": "repeat(12, minmax(0, 1fr))",
      },
    },
  },
  plugins: [],
};

export default config;
