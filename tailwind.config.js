/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FCFCFB",
        mist: "#F1F1EF",
        line: "#E3E3E0",
        ink: "#161615",
        mustard: "#A85C1F",
        "mustard-light": "#C97A34",
        "mustard-dark": "#8B4515",
      },
      backgroundImage: {
        "gradient-mustard": "linear-gradient(135deg, #C97A34 0%, #A85C1F 55%, #8B4515 100%)",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(20, 20, 18, 0.04)",
        mustard: "0 4px 14px rgba(139, 69, 21, 0.28)",
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
