import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// --- Telegram Mini App bootstrap ---
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
  try { tg.ready(); } catch (e) {}
  try { tg.expand(); } catch (e) {}                     // full height
  try { tg.setHeaderColor("#0A1030"); } catch (e) {}    // top of the dark navy background; App.jsx updates it per screen
  try { tg.setBackgroundColor("#0A1030"); } catch (e) {}
  try { tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {} // avoid accidental close on scroll
}

createRoot(document.getElementById("root")).render(<App />);
