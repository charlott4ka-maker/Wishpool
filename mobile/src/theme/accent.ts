// App accent colour themes (Premium): buttons, picked chips, toggled tabs and
// links follow the chosen accent. Blue (the logo blue) is the default and the
// free one. Classes (bg-blue, text-blueText, ...) read CSS variables set on the
// root view; raw values (icon colours) read C.blue & co, which are getters over
// the current accent: every screen calls useAccent(), so it re-renders in place
// when the accent changes (no remount, nothing moves).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export type AccentId = "blue" | "violet" | "pink" | "coral" | "green" | "teal";

const rgba = (h: string, a: number) => {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const make = (id: AccentId, base: string, text: string) => ({ id, base, text, soft: rgba(base, 0.16), line: rgba(base, 0.45) });

export const ACCENTS = [
  make("blue", "#0A82F9", "#7FB0FF"),
  make("violet", "#8B5CF6", "#B9A2FF"),
  make("pink", "#FF4D8D", "#FF9CC0"),
  make("coral", "#FF7A45", "#FFB08F"),
  make("green", "#2FBF5B", "#7EE29A"),
  make("teal", "#14B8A6", "#6FE3D6"),
];
export type Accent = (typeof ACCENTS)[number];

const KEY = "wp_accent";
let current: Accent = ACCENTS[0];
const subs = new Set<(a: Accent) => void>();

export const accent = () => current;

export const accentById = (id: string | null | undefined) => ACCENTS.find((a) => a.id === id) || ACCENTS[0];

/** CSS variables for the root view (NativeWind `vars`). */
export const accentVars = (a: Accent) => ({ "--accent": a.base, "--accent-soft": a.soft, "--accent-line": a.line, "--accent-text": a.text });

export async function loadAccent() {
  try {
    current = accentById(await AsyncStorage.getItem(KEY));
  } catch {
    /* storage unavailable: the default blue */
  }
  return current;
}

export function setAccent(id: AccentId) {
  current = accentById(id);
  AsyncStorage.setItem(KEY, current.id).catch(() => {});
  subs.forEach((cb) => cb(current));
}

export function onAccent(cb: (a: Accent) => void) {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

/** The current accent; re-renders the caller when it changes. */
export function useAccent(): Accent {
  const [a, setA] = useState(current);
  useEffect(() => onAccent(setA), []);
  return a;
}
