// App settings kept on the phone (AsyncStorage): notification switches and
// haptics. A tiny store with a hook, so the settings screen and haptic() read
// the same values.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export type Prefs = {
  /** The user turned notifications on in the app (the OS permission is asked then). */
  notifications: boolean;
  notifyBirthdays: boolean;
  notifyNewWishes: boolean;
  notifyRoomJoins: boolean;
  notifyGiftReminders: boolean;
  haptics: boolean;
  /** "YYYY-MM-DD"; friends get reminded (once the account is connected). */
  birthday: string | null;
};

const KEY = "wp_prefs";
const DEFAULTS: Prefs = {
  notifications: false,
  notifyBirthdays: true,
  notifyNewWishes: true,
  notifyRoomJoins: true,
  notifyGiftReminders: true,
  haptics: true,
  birthday: null,
};

let current: Prefs = DEFAULTS;
const subs = new Set<(p: Prefs) => void>();

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    current = { ...DEFAULTS, ...JSON.parse(raw) };
    subs.forEach((cb) => cb(current));
  })
  .catch(() => {});

export const getPrefs = () => current;

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  current = { ...current, [key]: value };
  subs.forEach((cb) => cb(current));
  AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => {});
}

export function usePrefs(): Prefs {
  const [p, setP] = useState(current);
  useEffect(() => {
    subs.add(setP);
    setP(current);
    return () => {
      subs.delete(setP);
    };
  }, []);
  return p;
}
