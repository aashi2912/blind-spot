/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        spot: {
          red: "#dc2626",
          dark: "#0a0a0a",
          card: "#141414",
          border: "#282828",
          muted: "#888888",
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', "serif"],
        body: ['"DM Sans"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
