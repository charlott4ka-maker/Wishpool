import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
// Montserrat, self-hosted (Latin + Cyrillic) so it works without Google Fonts.
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";

// --- Telegram Mini App bootstrap ---
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
  try { tg.ready(); } catch (e) {}
  try { tg.expand(); } catch (e) {}                     // full height
  try { tg.setHeaderColor("#111318"); } catch (e) {}    // match the app background
  try { tg.setBackgroundColor("#111318"); } catch (e) {}
  try { tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {} // avoid accidental close on scroll
}

createRoot(document.getElementById("root")).render(<App />);
