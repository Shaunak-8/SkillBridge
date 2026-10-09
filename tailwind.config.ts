import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#63708a",
        canvas: "#f7f9fc",
        line: "#e8edf5",
        brand: { DEFAULT: "#5c57e8", dark: "#4842d0", soft: "#eeefff" },
        mint: "#dbf5ed",
        amber: "#fff1d8",
        charcoal: "#181a20",
        warmCanvas: "#faf8f5",
        saffron: { DEFAULT: "#d97706", dark: "#b45309", light: "#fef3c7" },
        terracotta: { DEFAULT: "#c2410c", dark: "#9a3412", light: "#ffedd5" },
        sage: { DEFAULT: "#15803d", dark: "#166534", light: "#f0fdf4" },
        mustard: { DEFAULT: "#ca8a04", light: "#fef9c3" },
      },
      boxShadow: {
        soft: "0 14px 40px rgba(31, 45, 76, .08)",
        brutal: "2px 2px 0px #181a20",
        "brutal-sm": "1.5px 1.5px 0px #181a20",
        "brutal-lg": "3.5px 3.5px 0px #181a20",
        "brutal-press": "0px 0px 0px #181a20",
      },
      borderWidth: {
        "1.5": "1.5px",
      },
      borderRadius: { "2xl": "1.25rem" },
    },
  },
  plugins: [],
};

export default config;
