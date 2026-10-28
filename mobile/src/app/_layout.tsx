import "react-native-url-polyfill/auto";
import "../global.css";
import "../lib/nativewindInterop";

import { DarkTheme, Stack, ThemeProvider, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { ShareIntentProvider } from "expo-share-intent";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../auth/AuthContext";
import { ShareIntentHandler } from "../components/ShareIntentHandler";
import { LangProvider } from "../i18n";
import { ReminderSync } from "../settings/ReminderSync";
import { ToastHost } from "../components/Toast";
import { joinSheet, takePendingJoin } from "../lib/pendingJoin";
import { startAdminPreview } from "../lib/adminPreview";
import { startRemoteConfig } from "../lib/remoteConfig";
import { WishpoolProvider } from "../store/WishpoolContext";
import { SubscriptionProvider } from "../subscription/SubscriptionContext";
import { C } from "../theme/tokens";

// The share extension's native module isn't in Expo Go.
const IN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

SplashScreen.preventAutoHideAsync().catch(() => {});
// texts, banners and stickers from the admin page
startRemoteConfig();
startAdminPreview();

// Native iOS sheets: system grabber, swipe down to close, and our close button inside.
const SHEET = { presentation: "formSheet", sheetGrabberVisible: true, sheetCornerRadius: 32, contentStyle: { backgroundColor: C.card } } as const;
const FULL_FORM = { presentation: "fullScreenModal", contentStyle: { backgroundColor: C.card } } as const;
const FIT_SHEET = { ...SHEET, sheetAllowedDetents: "fitToContents" } as const;

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.blue, text: C.t1, border: "transparent" } };

function Gate() {
  const { status, user } = useAuth();
  const ready = status !== "loading";
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
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
  if (!ready) return null;
  return (
    <SubscriptionProvider userId={user?.id || null}>
      <WishpoolProvider>
        <ShareIntentHandler ready={inside} />
        {inside ? <ReminderSync /> : null}
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Protected guard={inside}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="room/[id]" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="faq" />
            {/* the two long forms are full screen, not sheets: dragging the folder sticker
                (and the photos) used to drag the sheet along */}
            <Stack.Screen name="wish/new" options={FULL_FORM} />
            <Stack.Screen name="room/new" options={FULL_FORM} />
            <Stack.Screen name="wish/[id]" options={FIT_SHEET} />
            <Stack.Screen name="room/take" options={FIT_SHEET} />
            <Stack.Screen name="room/wish" options={FIT_SHEET} />
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
          <Stack.Screen name="onboarding" options={{ presentation: "fullScreenModal" }} />
        </Stack>
      </WishpoolProvider>
    </SubscriptionProvider>
  );
}

export default function RootLayout() {
  return (
    <ShareIntentProvider options={{ disabled: IN_EXPO_GO, resetOnBackground: true }}>
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <LangProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <Gate />
            <ToastHost />
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </SafeAreaProvider>
    </ShareIntentProvider>
  );
}
