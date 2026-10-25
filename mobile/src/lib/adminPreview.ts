// The admin page's phone preview: the web build of the app in an iframe, as a
// guest with the demo content, showing the admin's unsaved texts and banners.
// The admin page (same site) calls window.__wpPreview directly:
//   setConfig({ strings, banners, stickers, previewBanner }) - the draft config;
//     previewBanner forces that banner onto the Wishes tab whatever its audience
//   go(path) - open a screen ("/", "/rooms", "/room/r-friends", "/settings"...)
// The first open (and a language change, ?lang=) fills the demo and reloads once.

import { router } from "expo-router";

import { fillDemo } from "./demo";
import { ADMIN_PREVIEW } from "./previewFlag";
import { setPreviewConfig, type RemoteConfig } from "./remoteConfig";

declare global {
  interface Window {
    __wpPreview?: { setConfig: (c: Partial<RemoteConfig> & { previewBanner?: string | null }) => void; go: (path: string) => void; ready: boolean };
  }
}

export function startAdminPreview() {
  if (!ADMIN_PREVIEW) return;
  const lang = (new URLSearchParams(window.location.search).get("lang") || "ru") as "uk" | "ru" | "en";
  const ls = window.localStorage;
  if (ls.getItem("wp_preview_seed") !== lang) {
    ls.setItem("wp_guest", "1");
    ls.setItem("wp_onboarded", "1");
    ls.setItem("wp_lang", lang);
    fillDemo(lang).then(() => {
      ls.setItem("wp_preview_seed", lang);
      setTimeout(() => window.location.reload(), 100);
    });
  }
  // the web build draws the tabs as a pill row at the top; the preview shows
  // them where the iPhone has them, as a bottom bar with icons
  const icon = (d: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>${d}</svg>`)}")`;
  const ICONS = [
    icon("<rect x='3' y='8' width='18' height='4' rx='1'/><path d='M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5'/>"),
    icon("<path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'/>"),
    icon("<circle cx='12' cy='12' r='10'/><circle cx='12' cy='10' r='3'/><path d='M7 20.66V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.66'/>"),
  ];
  const css = document.createElement("style");
  css.textContent =
    `[role="tablist"][aria-label="Main"]{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;width:auto!important;height:84px!important;margin:0!important;display:flex!important;justify-content:space-around!important;align-items:flex-start!important;padding:6px 8px 0!important;border-radius:0!important;background:rgba(21,24,29,.94)!important;backdrop-filter:blur(24px);box-shadow:none!important;border:0!important;transform:none!important;z-index:50}` +
    `[role="tablist"][aria-label="Main"] [role="tab"]{flex:1;display:flex!important;flex-direction:column;align-items:center;gap:3px;background:none!important;border:0!important;box-shadow:none!important;color:#8B93A3!important;padding:4px 0!important;height:auto!important}` +
    `[role="tablist"][aria-label="Main"] [role="tab"][aria-selected="true"]{color:#0A82F9!important}` +
    `[role="tablist"][aria-label="Main"] [role="tab"]::before{content:"";width:28px;height:28px;background:currentColor;-webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat}` +
    `[role="tablist"][aria-label="Main"] [role="tab"] span{font-size:10px!important;font-weight:600!important;color:inherit!important}` +
    ICONS.map((v, i) => `[role="tablist"][aria-label="Main"] [role="tab"]:nth-child(${i + 1}){--i:${v}}`).join("");
  document.head.appendChild(css);

  window.__wpPreview = {
    ready: false,
    setConfig: (c) => setPreviewConfig(c),
    go: (path) => {
      try {
        router.navigate(path as never);
      } catch {
        // not mounted yet: the admin page retries
      }
    },
  };
  setTimeout(() => window.__wpPreview && (window.__wpPreview.ready = true), 800);
}
