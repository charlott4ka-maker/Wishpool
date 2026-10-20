// Wishpool backend client for the native app. Same endpoints as the Telegram
// Mini App (web/src/App.jsx), but authenticated with a session token
// (Authorization: Bearer) instead of Telegram initData.
//
// Native sign-in (server/native-auth.js):
//   POST /api/auth/apple           { identityToken, fullName?, nonce } -> { token, user }
//   POST /api/auth/email/start     { email, lang }                     -> { ok }
//   POST /api/auth/email/verify    { email, code }                     -> { token, user }

import type { AppState, NewWish, Room, Wish } from "../types";

export const SITE_URL = "https://wishpool.clickbrickk.com";
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || SITE_URL).replace(/\/+$/, "");

let token: string | null = null;
export function setAuthToken(t: string | null) {
  token = t;
}

export class ApiError extends Error {
  constructor(message: string, public status = 0, public net = false) {
    super(message);
  }
}

// The server hands out its own photos as site-relative paths ("/p/…" from the
// bucket, "/api/img/…" still in the database): fine for the Mini App on the
// same site, but here they need the site in front. They lose it again on the
// way back, so the server still recognises its own photos when a wish is edited.
const OWN_PHOTO = /^\/(p|api\/img)\/\S+$/;
function mapStrings(v: unknown, fn: (s: string) => string): unknown {
  if (typeof v === "string") return fn(v);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, fn));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, fn)]));
  return v;
}
export const absolutePhotos = <T,>(v: T): T => mapStrings(v, (s) => (OWN_PHOTO.test(s) ? API_URL + s : s)) as T;
export const relativePhotos = (v: unknown) => mapStrings(v, (s) => (s.startsWith(API_URL + "/") && OWN_PHOTO.test(s.slice(API_URL.length)) ? s.slice(API_URL.length) : s));

async function req<T>(method: string, path: string, body?: unknown, opts: { timeout?: number; auth?: boolean } = {}): Promise<T> {
  if (!API_URL) throw new ApiError("no_api_url", 0, true);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token && opts.auth !== false) headers.Authorization = "Bearer " + token;
  // Without a timeout a request made in airplane mode can hang forever.
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeout || (method === "GET" ? 10000 : 30000));
  let res: Response;
  try {
    res = await fetch(API_URL + "/api" + path, { method, headers, body: body ? JSON.stringify(relativePhotos(body)) : undefined, signal: ctl.signal });
  } catch {
    throw new ApiError("network", 0, true);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    let e: { error?: string } = {};
    try {
      e = await res.json();
    } catch {}
    throw new ApiError(e.error || "http_" + res.status, res.status);
  }
  return absolutePhotos(await res.json()) as T;
}

export type AuthUser = { id: string; name: string; photo?: string | null; color?: string; email?: string | null };
export type AuthResponse = { token: string; user: AuthUser };

export const api = {
  configured: () => !!API_URL,
  state: () => req<AppState & { me?: unknown }>("GET", "/state"),
  createWish: (w: NewWish) => req<{ wish?: Wish }>("POST", "/wishes", w),
  updateWish: (id: string, w: Partial<NewWish>) => req("PATCH", "/wishes/" + id, w),
  deleteWish: (id: string) => req("DELETE", "/wishes/" + id),
  setGifted: (id: string, gifted: boolean) => req("POST", "/wishes/" + id + "/gifted", { gifted }),
  toggleWishRoom: (id: string, roomId: string) => req("POST", "/wishes/" + id + "/room", { roomId }),
  createRoom: (r: Partial<Room>) => req<{ room: { id: string } }>("POST", "/rooms", r),
  updateRoom: (id: string, r: Partial<Room>) => req("PATCH", "/rooms/" + id, r),
  leaveRoom: (id: string) => req("POST", "/rooms/" + id + "/leave"),
  deleteRoom: (id: string) => req("DELETE", "/rooms/" + id),
  joinRoom: (id: string, b: { inviterId?: string; asCelebrant?: boolean } = {}) => req<{ room: { id: string } }>("POST", "/rooms/" + id + "/join", b),
  /** What an invite shows before joining: name, sticker, colour, members, is it a surprise. */
  peekRoom: (id: string) =>
    req<{ room: Room & { member: boolean; memberCount: number; hasCelebrant: boolean } }>("GET", "/rooms/" + id + "/peek"),
  room: (id: string) => req<any>("GET", "/rooms/" + id),
  reserve: (id: string) => req("POST", "/wishes/" + id + "/reserve"),
  unreserve: (id: string) => req("DELETE", "/wishes/" + id + "/reserve"),
  chip: (id: string) => req("POST", "/wishes/" + id + "/chip"),
  unchip: (id: string) => req("DELETE", "/wishes/" + id + "/chip"),
  // slow shops + fallback services on the server: give it longer
  preview: (url: string) =>
    req<{ title: string; price: string; image: string | null; url: string; guess: boolean }>("GET", "/preview?url=" + encodeURIComponent(url), undefined, { timeout: 25000 }),
  // Account deletion (App Store guideline 5.1.1(v)): everything goes at once.
  deleteAccount: () => req("DELETE", "/me"),
  /** Name / photo from the profile editor (photo: a JPEG data URL, an unchanged https URL, or null). */
  updateMe: (b: { name?: string; photo?: string | null }) => req<{ user: AuthUser }>("PATCH", "/me", b),
  setBirthday: (birthday: string | null) => req("PUT", "/me/birthday", { birthday }),
  signOut: () => req("POST", "/sign-out", {}, { timeout: 5000 }),
  premiumStatus: () => req<{ isPremium: boolean }>("GET", "/me/premium"),

  auth: {
    apple: (b: { identityToken: string; nonce: string; fullName?: string | null; email?: string | null }) =>
      req<AuthResponse>("POST", "/auth/apple", b, { auth: false }),
    emailStart: (email: string, lang: string) => req<{ ok: boolean }>("POST", "/auth/email/start", { email, lang }, { auth: false }),
    emailVerify: (email: string, code: string) => req<AuthResponse>("POST", "/auth/email/verify", { email, code }, { auth: false }),
  },
};
