import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
// Montserrat, self-hosted (Latin + Cyrillic). Lightest weight used is 500.
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";

// --- Telegram Mini App bootstrap ---
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
  try { tg.ready(); } catch (e) {}
  try { tg.expand(); } catch (e) {}                     // full height
  try { tg.setHeaderColor("#000000"); } catch (e) {}    // match our black theme
  try { tg.setBackgroundColor("#000000"); } catch (e) {}
  try { tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {} // avoid accidental close on scroll
}

createRoot(document.getElementById("root")).render(<App />);
