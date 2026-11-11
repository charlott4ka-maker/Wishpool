import "react-native-url-polyfill/auto";
import "../global.css";
import "../lib/nativewindInterop";

import { DarkTheme, Stack, ThemeProvider, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { ShareIntentProvider } from "expo-share-intent";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { vars } from "nativewind";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../auth/AuthContext";
import { AccentGuard } from "../components/AccentPicker";
import { ShareIntentHandler } from "../components/ShareIntentHandler";
import { LangProvider } from "../i18n";
import { ReminderSync } from "../settings/ReminderSync";
import { ToastHost } from "../components/Toast";
import { UploadBarHost } from "../components/UploadBar";
import { joinSheet, takePendingJoin } from "../lib/pendingJoin";
import { startAdminPreview } from "../lib/adminPreview";
import { startRemoteConfig } from "../lib/remoteConfig";
import { quickUpdate } from "../lib/quickUpdate";
import { IN_TG, tgStartParam } from "../lib/telegram";
import { WishpoolProvider } from "../store/WishpoolContext";
import { SubscriptionProvider } from "../subscription/SubscriptionContext";
import { C } from "../theme/tokens";
import { accent, accentVars, loadAccent, onAccent } from "../theme/accent";

// The share extension's native module isn't in Expo Go.
const IN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

SplashScreen.preventAutoHideAsync().catch(() => {});
// a fresh update applies on this launch (the splash stays up for up to 3s)
const updateChecked = quickUpdate();
const tgStartHandled = { done: false };
// texts, banners and stickers from the admin page
startRemoteConfig();
startAdminPreview();

// Native iOS sheets: system grabber, swipe down to close, and our close button inside.
const SHEET = { presentation: "formSheet", sheetGrabberVisible: true, sheetCornerRadius: 32, contentStyle: { backgroundColor: C.card } } as const;
const FULL_FORM = { presentation: "fullScreenModal", contentStyle: { backgroundColor: C.card } } as const;
const FIT_SHEET = { ...SHEET, sheetAllowedDetents: "fitToContents" } as const;

const navTheme = () => ({ ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.blue, text: C.t1, border: "transparent" } });
// the saved accent, read before the first screen shows
const accentLoaded = loadAccent();

// The accent (Premium themes): re-renders on a change
function useAccent() {
  const [a, setA] = useState(accent());
  useEffect(() => onAccent(setA), []);
  return a;
}

function Gate() {
  const { status, user } = useAuth();
  const acc = useAccent();
  const [accReady, setAccReady] = useState(false);
  useEffect(() => {
    accentLoaded.finally(() => setAccReady(true));
  }, []);
  const ready = status !== "loading" && accReady;
  useEffect(() => {
    if (ready) updateChecked.finally(() => SplashScreen.hideAsync().catch(() => {}));
  }, [ready]);
  const inside = status === "signedIn" || status === "guest";
  // an invite opened before signing in comes back once there's an account
  const router = useRouter();
  useEffect(() => {
    if (status !== "signedIn") return;
    // after the screens settle: the invite sheet may have stayed open through sign-in
    const timer = setTimeout(() => {
      if (joinSheet.open) return;
      takePendingJoin().then((p) => {
        if (p && !joinSheet.open) router.push({ pathname: "/join/[id]", params: p.from ? { id: p.id, from: p.from } : { id: p.id } });
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [status, router]);
  // the Telegram Mini App opened from a link: t.me/wishpool_bot/app?startapp=<room>[__<inviter>] or fr_<code>
  useEffect(() => {
    if (status !== "signedIn" || !IN_TG || tgStartHandled.done) return;
    tgStartHandled.done = true;
    const p = tgStartParam();
    if (!p) return;
    const timer = setTimeout(() => {
      if (p.startsWith("fr_")) router.push({ pathname: "/friend/[code]", params: { code: p.slice(3) } });
      else {
        const [id, from] = p.split("__");
        if (id) router.push({ pathname: "/join/[id]", params: from ? { id, from } : { id } });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [status, router]);
  if (!ready) return null;
  return (
    <SubscriptionProvider userId={user?.id || null}>
      <WishpoolProvider>
        <ShareIntentHandler ready={inside} />
        <AccentGuard />
        {inside ? <ReminderSync /> : null}
        {/* the accent: CSS variables for the classes; the key remounts the screens so
            raw colours (C.blue) are read again */}
        <View key={acc.id} style={[{ flex: 1 }, vars(accentVars(acc))]}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Protected guard={inside}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="room/[id]" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="faq" />
            <Stack.Screen name="friends" />
            <Stack.Screen name="friends-guest" options={FIT_SHEET} />
            {/* the two long forms are full screen, not sheets: dragging the folder sticker
                (and the photos) used to drag the sheet along */}
            <Stack.Screen name="wish/new" options={FULL_FORM} />
            <Stack.Screen name="room/new" options={FULL_FORM} />
            <Stack.Screen name="wish/[id]" options={FIT_SHEET} />
            <Stack.Screen name="room/take" options={FIT_SHEET} />
            <Stack.Screen name="room/wish" options={FIT_SHEET} />
            <Stack.Screen name="room/add" options={FIT_SHEET} />
            <Stack.Screen name="room/draw" options={FIT_SHEET} />
            <Stack.Screen name="room/member" options={FIT_SHEET} />
            <Stack.Screen name="room/pick" options={FIT_SHEET} />
            <Stack.Screen name="birthday" options={FIT_SHEET} />
            <Stack.Screen name="profile-edit" options={FIT_SHEET} />
            <Stack.Screen name="paywall" options={{ presentation: "fullScreenModal" }} />
          </Stack.Protected>
          <Stack.Protected guard={!inside}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
          {/* open both from the welcome screen and for guests ("Sign in" in the app) */}
          <Stack.Screen name="sign-in-options" options={FIT_SHEET} />
          {/* full screen: opened from a link it came up as a full-height sheet with the
              close button under the status bar and everything stuck to the top */}
          <Stack.Screen name="join/[id]" options={{ presentation: "fullScreenModal" }} />
          {/* someone's friend link, for guests too (they're asked to sign in) */}
          <Stack.Screen name="friend/[code]" options={{ presentation: "fullScreenModal" }} />
          <Stack.Screen name="onboarding" options={{ presentation: "fullScreenModal" }} />
        </Stack>
        </View>
      </WishpoolProvider>
    </SubscriptionProvider>
  );
}

export default function RootLayout() {
  const acc = useAccent();
  return (
    <ShareIntentProvider options={{ disabled: IN_EXPO_GO, resetOnBackground: true }}>
    <SafeAreaProvider>
      <ThemeProvider value={navTheme()} key={acc.id}>
        <LangProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <Gate />
            <UploadBarHost />
            <ToastHost />
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </SafeAreaProvider>
    </ShareIntentProvider>
  );
}
