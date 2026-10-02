import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07111f",
        panel: "#0d1b2a",
        mint: "#b8f397",
        aqua: "#7dd3fc",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(184, 243, 151, 0.12), 0 20px 60px rgba(0, 0, 0, 0.24)",
      },
    },
  },
  plugins: [],
} satisfies Config;
