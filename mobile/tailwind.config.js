// Design tokens mirror `C`, `H` and `R` in web/src/App.jsx so both apps look the same.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#000000",
        card: "#161618",
        card2: "#232326",
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
      },
      // Montserrat only, and never Regular: the lightest weight is Medium (500).
      // On native each weight is its own font file, so weights are font families.
      fontFamily: {
        m500: ["Montserrat_500Medium"],
        m600: ["Montserrat_600SemiBold"],
        m700: ["Montserrat_700Bold"],
        m800: ["Montserrat_800ExtraBold"],
      },
      // Buttons and controls come in exactly two heights.
      height: { lg: 52, sm: 40 },
      width: { lg: 52, sm: 40 },
      borderRadius: { card: 26, tile: 18, sheet: 32 },
    },
  },
  plugins: [],
};
