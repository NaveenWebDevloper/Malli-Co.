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
        gold: {
          500: "#A68A56",
          600: "#8F7341",
        },
      },
    },
  },
  plugins: [],
};

export default config;
