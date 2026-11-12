// Feature switches the admin page turns on and off without a new build (Флаги):
// each is on or off for everyone, or for a share of people (a stable hash of the
// account, or of the phone for guests, so the same person stays in or out).
// FLAGS is also exported to the admin page (scripts/export-admin-data.mjs).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { getRemoteConfig, useRemoteConfig } from "./remoteConfig";

export type FlagId = "holidaySnow" | "santaSnow" | "drawReveal" | "newYearCard" | "premiumCard" | "ratePrompt";

/** what each switch does (ru, for the admin page) and its default when the admin page says nothing */
export const FLAGS: { id: FlagId; title: string; about: string; on: boolean }[] = [
  { id: "holidaySnow", title: "Снег на «Желаниях»", about: "Лёгкий снег поверх вкладки «Желания» с середины ноября до 7 января (у кого он включён в настройках).", on: true },
  { id: "santaSnow", title: "Снег в комнате Санты", about: "Снег на несколько секунд при каждом заходе в комнату Тайного Санты.", on: true },
  { id: "drawReveal", title: "Коробка при жеребьёвке", about: "Первый раз, когда видишь, кто тебе выпал, коробка трясётся и открывается.", on: true },
  { id: "newYearCard", title: "Отсчёт до Нового года", about: "Карточка «N дней до Нового года» на вкладке «Комнаты».", on: true },
  { id: "premiumCard", title: "Карточка Premium в профиле", about: "Карточка «Попробовать бесплатно» под днём рождения в профиле, пока нет Premium.", on: true },
  { id: "ratePrompt", title: "Просьба об оценке", about: "Системное окно «Оцените Wishpool» после 3-го желания.", on: true },
];

const DEVICE_KEY = "wp_device_id";
let device = "";
AsyncStorage.getItem(DEVICE_KEY)
  .then((v) => {
    if (v) device = v;
    else {
      device = Math.random().toString(36).slice(2) + Date.now().toString(36);
      AsyncStorage.setItem(DEVICE_KEY, device).catch(() => {});
    }
  })
  .catch(() => {});

// 0..99, the same every time for the same person and switch
function bucket(id: string, who: string) {
  let h = 2166136261;
  for (const c of id + ":" + who) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % 100;
}

function decide(id: FlagId, flags: Record<string, { on: boolean; percent: number }> | undefined, who: string) {
  const f = flags?.[id];
  if (!f) return FLAGS.find((x) => x.id === id)?.on ?? true;
  if (!f.on) return false;
  return f.percent >= 100 || bucket(id, who || "x") < f.percent;
}

let lastUser = "";
/** outside React (e.g. lib/review.ts) */
export const flagOn = (id: FlagId) => decide(id, getRemoteConfig().flags, lastUser || device);

export function useFlag(id: FlagId): boolean {
  const { flags } = useRemoteConfig();
  const { user } = useAuth();
  if (user?.id) lastUser = user.id;
  const [dev, setDev] = useState(device);
  useEffect(() => {
    if (!dev) {
      const t = setTimeout(() => setDev(device), 300);
      return () => clearTimeout(t);
    }
  }, [dev]);
  return decide(id, flags, user?.id || dev);
}
