// Tailwind configuration
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { bg: "#0B0D10" },
    },
  },
} satisfies Config;
