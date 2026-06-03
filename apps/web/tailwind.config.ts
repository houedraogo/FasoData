import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs officielles FasoData
        faso: {
          navy: "#1A2C42",
          "navy-light": "#243552",
          red: "#E04E2F",
          "red-light": "#F06040",
          gold: "#F5A623",
          green: "#2E7D52",
          "blue-light": "#8898B0",
        },
        brand: {
          primary: "#1A2C42",
          secondary: "#E04E2F",
          accent: "#F5A623",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
