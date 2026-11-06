// The app's web build running as the Telegram Mini App (wishpool.clickbrickk.com/tg,
// opened from t.me/wishpool_bot/app). Telegram signs the user in: every API call
// carries its initData (X-Init-Data, checked by server/auth.js), so there's no
// sign-in screen. Links, sharing and haptics go through Telegram's own APIs.

import { Platform } from "react-native";

type TgUser = { id: number; first_name?: string; last_name?: string; photo_url?: string; language_code?: string };
type WebApp = {
  initData: string;
  initDataUnsafe: { user?: TgUser; start_param?: string };
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  setBottomBarColor?: (c: string) => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  HapticFeedback?: { impactOccurred: (s: string) => void; notificationOccurred: (s: string) => void; selectionChanged: () => void };
};

const wa: WebApp | null =
  Platform.OS === "web" && typeof window !== "undefined" ? ((window as unknown as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp ?? null) : null;

/** Inside Telegram with a signed initData. */
export const TG = wa && wa.initData ? wa : null;
export const IN_TG = !!TG;
export const tgInitData = TG ? TG.initData : "";
export const BOT_APP = "https://t.me/wishpool_bot/app";

export function tgUser(): { id: string; name: string; photo: string | null } | null {
  const u = TG?.initDataUnsafe.user;
  if (!u) return null;
  return { id: String(u.id), name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "User", photo: u.photo_url || null };
}

export function tgLanguage(): string | null {
  return TG?.initDataUnsafe.user?.language_code || null;
}

export function tgStartParam(): string | null {
  return TG?.initDataUnsafe.start_param || null;
}

export function tgHaptic(kind: "light" | "select" | "success" | "warning" | "error") {
  const h = TG?.HapticFeedback;
  if (!h) return;
  if (kind === "select") h.selectionChanged();
  else if (kind === "light") h.impactOccurred("light");
  else h.notificationOccurred(kind);
}

/** Telegram's share picker: the link plus a line of text. */
export function tgShare(url: string, text: string) {
  TG?.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
}

// once, on start: full height, no swipe-to-close while scrolling, our colours,
// and outside links open through Telegram (window.open is what the app uses on web)
if (TG) {
  try {
    TG.ready();
    TG.expand();
    TG.disableVerticalSwipes?.();
    TG.setHeaderColor?.("#15181D");
    TG.setBackgroundColor?.("#15181D");
    TG.setBottomBarColor?.("#15181D");
    const open = window.open.bind(window);
    window.open = ((url?: string | URL, ...rest: unknown[]) => {
      const u = String(url || "");
      if (/^https:\/\/t\.me\//.test(u)) return TG.openTelegramLink(u), null;
      if (/^https?:\/\//.test(u)) return TG.openLink(u), null;
      return open(url as string, ...(rest as [string?, string?]));
    }) as typeof window.open;
  } catch {}
}
