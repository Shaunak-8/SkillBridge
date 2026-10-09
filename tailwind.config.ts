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
      },
      boxShadow: { soft: "0 14px 40px rgba(31, 45, 76, .08)" },
      borderRadius: { "2xl": "1.25rem" },
    },
  },
  plugins: [],
};

export default config;
