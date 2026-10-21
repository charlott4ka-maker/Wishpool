// What the admin page (wishpool.clickbrickk.com/admin) sets without a new
// build: text overrides, banners on the Wishes tab, hidden and new stickers.
// Read from GET /api/config on start and whenever the app comes back to the
// front (at most every few minutes); the last copy is kept on the phone so it
// shows at once next time, and a failed request just keeps what we have.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { API_URL } from "../services/api";

type L = { uk?: string; ru?: string; en?: string };
export type RemoteBanner = {
  id: string;
  audience: "all" | "signedIn" | "guest";
  text: L;
  color1: string;
  color2: string;
  textColor: string;
  sticker: string;
  action: "none" | "link" | "signin";
  url: string;
  dismissible: boolean;
};
export type RemoteConfig = {
  strings: Record<string, L>;
  banners: RemoteBanner[];
  stickers: { hidden: string[]; extra: { name: string }[] };
};

const KEY = "wp_remote_config";
const EVERY = 5 * 60 * 1000;
const EMPTY: RemoteConfig = { strings: {}, banners: [], stickers: { hidden: [], extra: [] } };

let current: RemoteConfig = EMPTY;
let fetchedAt = 0;
const subs = new Set<(c: RemoteConfig) => void>();
const set = (c: RemoteConfig) => {
  current = c;
  subs.forEach((cb) => cb(c));
};

export const getRemoteConfig = () => current;

async function load() {
  fetchedAt = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(API_URL + "/api/config", { signal: ctl.signal });
    if (!r.ok) return;
    const c = { ...EMPTY, ...(await r.json()) } as RemoteConfig;
    set(c);
    AsyncStorage.setItem(KEY, JSON.stringify(c)).catch(() => {});
  } catch {
    // offline: keep the last copy
  } finally {
    clearTimeout(timer);
  }
}

let started = false;
/** Called once from the root layout. */
export function startRemoteConfig() {
  if (started) return;
  started = true;
  AsyncStorage.getItem(KEY)
    .then((raw) => raw && fetchedAt === 0 && set({ ...EMPTY, ...JSON.parse(raw) }))
    .catch(() => {})
    .finally(() => load());
  AppState.addEventListener("change", (s) => {
    if (s === "active" && Date.now() - fetchedAt > EVERY) load();
  });
}

export function useRemoteConfig(): RemoteConfig {
  const [c, setC] = useState(current);
  useEffect(() => {
    subs.add(setC);
    setC(current);
    return () => {
      subs.delete(setC);
    };
  }, []);
  return c;
}

/** Where an uploaded sticker lives (the site serves it from the bucket). */
export const remoteStickerUrl = (name: string) => `${API_URL}/stickers/${name}.webp`;
