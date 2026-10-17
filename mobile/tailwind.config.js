// Design tokens, same as src/theme/tokens.ts. The iOS app has its own surfaces
// (blocks on a lighter page) and the system SF Pro font.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#222831",
        card: "#15181D",
        card2: "#23262B",
        line: "rgba(255,255,255,0.08)",
        t1: "#FFFFFF",
        t2: "#8A8A8E",
        t3: "#5A5A5E",
        blue: "#2E7DF6",
        blueSoft: "rgba(46,125,246,0.16)",
        blueLine: "rgba(46,125,246,0.45)",
        blueText: "#7FB0FF",
        green: "#34C759",
        greenSoft: "rgba(52,199,89,0.16)",
        greenText: "#7EE29A",
        danger: "#FF5A5A",
        gold: "#FFC94D",
        brand: "#1F3E7B",
      },
      // iOS system font (SF Pro), never Regular: the lightest weight is Medium (500).
      // font-m500..font-m800 are kept as class names so weights read the same as in the Mini App.
      fontWeight: {
        m500: "500",
        m600: "600",
        m700: "700",
        m800: "800",
      },
      // Buttons and controls come in exactly two heights.
      height: { lg: 52, sm: 40 },
      width: { lg: 52, sm: 40 },
      borderRadius: { card: 26, tile: 18, sheet: 32 },
    },
  },
  plugins: [],
};
