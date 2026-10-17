// Wishpool backend client for the native app. Same endpoints as the Telegram
// Mini App (web/src/App.jsx), but authenticated with a session token
// (Authorization: Bearer) instead of Telegram initData.
//
// Native auth endpoints the backend needs (see mobile/README.md, "Backend"):
//   POST /api/auth/apple           { identityToken, fullName?, nonce } -> { token, user }
//   POST /api/auth/email/start     { email }                           -> { ok }
//   POST /api/auth/email/verify    { email, code }                     -> { token, user }
//   GET  /api/auth/telegram/start?redirect=wishpool://auth             -> Telegram Login, then
//        302 to wishpool://auth?token=...

import type { AppState, NewWish, Room, Wish } from "../types";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

let token: string | null = null;
export function setAuthToken(t: string | null) {
  token = t;
}

export class ApiError extends Error {
  constructor(message: string, public status = 0, public net = false) {
    super(message);
  }
}

async function req<T>(method: string, path: string, body?: unknown, opts: { timeout?: number; auth?: boolean } = {}): Promise<T> {
  if (!API_URL) throw new ApiError("no_api_url", 0, true);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token && opts.auth !== false) headers.Authorization = "Bearer " + token;
  // Without a timeout a request made in airplane mode can hang forever.
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeout || (method === "GET" ? 10000 : 30000));
  let res: Response;
  try {
    res = await fetch(API_URL + "/api" + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
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
  return res.json() as Promise<T>;
}

export type AuthUser = { id: string; name: string; photo?: string | null; email?: string | null };
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
  joinRoom: (id: string) => req("POST", "/rooms/" + id + "/join", {}),
  room: (id: string) => req<any>("GET", "/rooms/" + id),
  reserve: (id: string) => req("POST", "/wishes/" + id + "/reserve"),
  unreserve: (id: string) => req("DELETE", "/wishes/" + id + "/reserve"),
  chip: (id: string) => req("POST", "/wishes/" + id + "/chip"),
  unchip: (id: string) => req("DELETE", "/wishes/" + id + "/chip"),
  // slow shops + fallback services on the server: give it longer
  preview: (url: string) =>
    req<{ title: string; price: string; image: string | null; url: string; guess: boolean }>("GET", "/preview?url=" + encodeURIComponent(url), undefined, { timeout: 25000 }),
  // Account deletion (App Store guideline 5.1.1(v)); the backend endpoint is still to do.
  deleteAccount: () => req("DELETE", "/me"),
  /** Name / photo from the profile editor. Needs PATCH /api/me on the backend. */
  updateMe: (b: { name?: string; photo?: string | null }) => req("PATCH", "/me", b),
  premiumStatus: () => req<{ isPremium: boolean }>("GET", "/me/premium"),

  auth: {
    apple: (b: { identityToken: string; nonce: string; fullName?: string | null; email?: string | null }) =>
      req<AuthResponse>("POST", "/auth/apple", b, { auth: false }),
    emailStart: (email: string) => req<{ ok: boolean }>("POST", "/auth/email/start", { email }, { auth: false }),
    emailVerify: (email: string, code: string) => req<AuthResponse>("POST", "/auth/email/verify", { email, code }, { auth: false }),
    telegramStartUrl: (redirect: string) => `${API_URL}/api/auth/telegram/start?redirect=${encodeURIComponent(redirect)}`,
  },
};
