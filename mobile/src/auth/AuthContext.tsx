// Sign-in for the native app. Three ways in, same Wishpool account behind them:
//   - Sign in with Apple (required by App Review when other social logins exist)
//   - Telegram (Telegram Login in a browser session, back via wishpool://auth)
//   - e-mail with a one-time code
// plus "try without an account": a local-only guest mode, like the Mini App
// outside Telegram. The session token lives in the iOS Keychain (SecureStore).

import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import { api, AuthUser, setAuthToken } from "../services/api";
import { secureStorage } from "./secureStorage";

const TOKEN_KEY = "wp_token";
const USER_KEY = "wp_user";
const GUEST_KEY = "wp_guest";

export type AuthStatus = "loading" | "signedOut" | "guest" | "signedIn";

type AuthValue = {
  status: AuthStatus;
  user: AuthUser | null;
  appleAvailable: boolean;
  signInWithApple: () => Promise<boolean>;
  signInWithTelegram: () => Promise<boolean>;
  startEmail: (email: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === "ios") setAppleAvailable(await AppleAuthentication.isAvailableAsync().catch(() => false));
      const [token, rawUser, guest] = await Promise.all([
        secureStorage.get(TOKEN_KEY),
        secureStorage.get(USER_KEY),
        secureStorage.get(GUEST_KEY),
      ]);
      if (token) {
        setAuthToken(token);
        setUser(rawUser ? JSON.parse(rawUser) : null);
        setStatus("signedIn");
      } else setStatus(guest ? "guest" : "signedOut");
    })().catch(() => setStatus("signedOut"));
  }, []);

  const finish = useCallback(async (token: string, u: AuthUser) => {
    await secureStorage.set(TOKEN_KEY, token);
    await secureStorage.set(USER_KEY, JSON.stringify(u));
    await secureStorage.remove(GUEST_KEY);
    setAuthToken(token);
    setUser(u);
    setStatus("signedIn");
  }, []);

  const signInWithApple = useCallback(async () => {
    // Apple gets the SHA-256 of a random nonce; the backend receives the raw
    // nonce and checks it against the identity token, so a token can't be replayed.
    const nonce = Crypto.randomUUID();
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashed,
      });
      if (!cred.identityToken) throw new Error("no_identity_token");
      // Apple shares the name only on the very first sign-in: pass it on now.
      const fullName = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(" ") || null;
      const res = await api.auth.apple({ identityToken: cred.identityToken, nonce, fullName, email: cred.email });
      await finish(res.token, res.user);
      return true;
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return false;
      throw e;
    }
  }, [finish]);

  const signInWithTelegram = useCallback(async () => {
    const redirect = Linking.createURL("auth");
    const res = await WebBrowser.openAuthSessionAsync(api.auth.telegramStartUrl(redirect), redirect);
    if (res.type !== "success") return false;
    const { queryParams } = Linking.parse(res.url);
    const token = typeof queryParams?.token === "string" ? queryParams.token : null;
    if (!token) throw new Error("telegram_no_token");
    const name = typeof queryParams?.name === "string" ? queryParams.name : "";
    await finish(token, { id: String(queryParams?.uid || ""), name });
    return true;
  }, [finish]);

  const startEmail = useCallback(async (email: string) => {
    await api.auth.emailStart(email.trim().toLowerCase());
  }, []);

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      const res = await api.auth.emailVerify(email.trim().toLowerCase(), code.trim());
      await finish(res.token, res.user);
    },
    [finish],
  );

  const continueAsGuest = useCallback(async () => {
    await secureStorage.set(GUEST_KEY, "1");
    setStatus("guest");
  }, []);

  const signOut = useCallback(async () => {
    await Promise.all([TOKEN_KEY, USER_KEY, GUEST_KEY].map((k) => secureStorage.remove(k)));
    setAuthToken(null);
    setUser(null);
    setStatus("signedOut");
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ status, user, appleAvailable, signInWithApple, signInWithTelegram, startEmail, verifyEmail, continueAsGuest, signOut }),
    [status, user, appleAvailable, signInWithApple, signInWithTelegram, startEmail, verifyEmail, continueAsGuest, signOut],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
