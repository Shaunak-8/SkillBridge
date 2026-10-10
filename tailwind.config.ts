import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // NeoFlux & Neo-Brutalist Core Palette
        cream: "#F7F0D2",
        nearBlack: "#151515",
        hotPink: {
          DEFAULT: "#D83D63",
          hover: "#C02C51",
          light: "#FCE8ED",
        },
        gold: {
          DEFAULT: "#F2BE4E",
          hover: "#E0AC3C",
          light: "#FEF7E6",
        },
        neoMuted: "#655F52",
        neoBorder: "#111111",

        // Compatibility aliases
        ink: "#151515",
        muted: "#655F52",
        canvas: "#F7F0D2",
        line: "#111111",
        brand: { DEFAULT: "#D83D63", dark: "#C02C51", soft: "#FCE8ED" },
        mint: "#dbf5ed",
        amber: "#F2BE4E",
        charcoal: "#151515",
        warmCanvas: "#FFFFFF",
        saffron: { DEFAULT: "#F2BE4E", dark: "#E0AC3C", light: "#FEF7E6" },
        terracotta: { DEFAULT: "#D83D63", dark: "#C02C51", light: "#FCE8ED" },
        sage: { DEFAULT: "#15803d", dark: "#166534", light: "#f0fdf4" },
        mustard: { DEFAULT: "#F2BE4E", light: "#FEF7E6" },
      },
      boxShadow: {
        soft: "4px 4px 0 #111111",
        brutal: "4px 4px 0 #111111",
        "brutal-sm": "2px 2px 0 #111111",
        "brutal-lg": "6px 6px 0 #111111",
        "brutal-press": "0px 0px 0 #111111",
        neo: "4px 4px 0 #111111",
        "neo-sm": "2px 2px 0 #111111",
        "neo-lg": "6px 6px 0 #111111",
        "neo-xl": "8px 8px 0 #111111",
      },
      borderWidth: {
        "1.5": "1.5px",
        "2": "2px",
      },
      borderRadius: { "2xl": "1.25rem" },
    },
  },
  plugins: [],
};

export default config;
