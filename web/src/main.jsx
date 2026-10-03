import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
// Inter for text, Oswald for headings; self-hosted (Latin + Cyrillic).
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/oswald/700.css";

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
