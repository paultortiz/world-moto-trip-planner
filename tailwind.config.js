/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/help/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        adv: {
          night: "#020617", // deep navy/black
          panel: "#020617",
          border: "#1e293b",
          accent: "#f97316", // orange-500 like
          accentMuted: "#ea580c", // orange-600 like
          accentSoft: "#fed7aa", // orange-100 like
        },
      },
      boxShadow: {
        "adv-glow": "0 0 40px rgba(248, 250, 252, 0.06)",
      },
      keyframes: {
        "pulse-once": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "pulse-once": "pulse-once 0.6s ease-in-out 2",
      },
    },
  },
  plugins: [],
};
