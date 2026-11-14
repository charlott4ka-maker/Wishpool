// Home-screen widgets (Premium, iOS): the nearest birthday and Secret Santa
// (targets/widget/Widgets.swift). The app writes one JSON string into the App
// Group whenever rooms, Premium or the language change; the widget counts the
// days itself, so it moves at midnight without the app being opened.
import { ExtensionStorage } from "@bacons/apple-targets";
import { useEffect } from "react";
import { Platform } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";
import { daysUntil } from "../lib/dates";
import { api } from "../services/api";
import { useWishpool, wishImages } from "../store/WishpoolContext";
import { NEW_YEAR_STICKERS } from "../subscription/featureFlags";
import { useSubscription } from "../subscription/SubscriptionContext";
import type { Room } from "../types";
import { getPrefs } from "./prefs";

export const APP_GROUP = "group.app.wishpool.ios";
const store = new ExtensionStorage(APP_GROUP);

const initial = (name: string) => (name.trim()[0] || "?").toUpperCase();

/** days to the next MM-DD of a birthday room's date (this year or next) */
function daysToBirthday(date?: string): number | null {
  if (!date) return null;
  const [, m, d] = date.split("-").map(Number);
  if (!m || !d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next < today) next = new Date(now.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function WidgetSync() {
  const { rooms } = useWishpool();
  const { isPremium } = useSubscription();
  const { status } = useAuth();
  const { t, lang } = useT();

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let live = true;
    (async () => {
      // the nearest birthday among birthday rooms
      const bdays = rooms
        .filter((r) => r.type === "birthday" && r.eventDate)
        .map((r) => ({ r, n: daysToBirthday(r.eventDate) }))
        .filter((x): x is { r: Room; n: number } => x.n != null)
        .sort((a, b) => a.n - b.n);
      const b = bdays[0]?.r;
      const who = b ? (b.bdayMode === "other" && b.celebrantName ? b.celebrantName : b.name) : "";
      // Secret Santa: the room with the nearest swap date (or any), and who you got
      const santas = rooms
        .filter((r) => NEW_YEAR_STICKERS.includes(r.emoji))
        .sort((a, c) => (daysUntil(a.eventDate) ?? 999) - (daysUntil(c.eventDate) ?? 999));
      const s = santas[0];
      let target: { name: string; color: string; initial: string } | null = null;
      let giftPhotos: string[] = [];
      let drawn = 0;
      if (s && status === "signedIn" && api.configured() && !getPrefs().demo) {
        const d = await api.draw(s.id).catch(() => null);
        if (d?.drawn) drawn = 1;
        if (d?.target) target = { name: d.target.name, color: d.target.color, initial: initial(d.target.name) };
        // the photos of their wishes, for the Santa folder widget
        giftPhotos = (d?.wishes || []).flatMap((w) => wishImages(w).slice(0, 1)).filter((u) => u.startsWith("https://")).slice(0, 3);
      }
      if (!live) return;
      const payload = {
        premium: isPremium ? 1 : 0,
        lang,
        bday: b ? { roomId: b.id, name: who, md: (b.eventDate || "").slice(5), color: b.tint, initial: initial(who), sticker: b.emoji, photos: (b.photos || []).filter((u) => u.startsWith("https://")).slice(0, 3) } : null,
        santa: s ? { roomId: s.id, room: s.name, date: s.eventDate || "", drawn, target, sticker: s.emoji, color: s.tint, photos: giftPhotos } : null,
        s: {
          bdayTitle: t("wgBday"), today: t("evToday"), tomorrow: t("evTomorrow"), bdayEmpty: t("wgBdayEmpty"),
          santaTitle: t("wgSanta"), youGive: t("wgYouGive"), notDrawn: t("wgNotDrawn"), swapIn: t("wgSwapIn"), swapToday: t("wgSwapToday"),
          santaEmpty: t("wgSantaEmpty"), locked: t("wgLocked"),
        },
      };
      store.set("wp_widget", JSON.stringify(payload));
      ExtensionStorage.reloadWidget();
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [rooms, isPremium, status, lang, t]);

  return null;
}
