import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// --- Telegram Mini App bootstrap ---
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
  try { tg.ready(); } catch (e) {}
  try { tg.expand(); } catch (e) {}                     // full height
  try { tg.setHeaderColor("#5A8FC6"); } catch (e) {}    // top of the Wishes colour field; App.jsx updates it per screen
  try { tg.setBackgroundColor("#5A8FC6"); } catch (e) {}
  try { tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {} // avoid accidental close on scroll
}

createRoot(document.getElementById("root")).render(<App />);
