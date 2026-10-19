/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy tokens (old screens still use these until each is redesigned)
        spot: {
          red: "#dc2626",
          dark: "#0a0a0a",
          card: "#141414",
          border: "#282828",
          muted: "#888888",
        },
        // Blind Spot v2 design system
        void: "#0B0D14",     // app background (cool near-black)
        surface: "#151826",  // raised cards/panels
        line: "#272B3D",     // hairline borders
        primary: { DEFAULT: "#7C5CFF", soft: "#A594FF" }, // "inside your bubble"
        accent: "#FF8A5B",   // "the way out" — used only for blind-spots / escape moments
        ink: { DEFAULT: "#F2F3F7", muted: "#9AA0B4" },
      },
      fontFamily: {
        brand: ['"Bricolage Grotesque"', "sans-serif"], // v2 display
        display: ['"DM Serif Display"', "serif"],        // legacy
        body: ['"DM Sans"', "sans-serif"],
      },
      boxShadow: {
        glow: "0 8px 30px -8px rgba(124,92,255,0.6)",
      },
    },
  },
  plugins: [],
};
