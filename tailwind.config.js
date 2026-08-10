/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#08080A",
        graphite: "#121316",
        gold: "#E5C158",
        titanium: "#E2E8F0",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "SF Pro Display", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "SF Mono", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
