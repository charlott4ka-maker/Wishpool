import "react-native-url-polyfill/auto";
import "../global.css";
import "../lib/nativewindInterop";

import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../auth/AuthContext";
import { LangProvider } from "../i18n";
import { WishpoolProvider } from "../store/WishpoolContext";
import { SubscriptionProvider } from "../subscription/SubscriptionContext";
import { C } from "../theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Native iOS sheets: system grabber, swipe down to close, and our close button inside.
const SHEET = { presentation: "formSheet", sheetGrabberVisible: true, sheetCornerRadius: 32, contentStyle: { backgroundColor: C.card } } as const;
const LARGE_SHEET = { ...SHEET, sheetAllowedDetents: [1] };
const FIT_SHEET = { ...SHEET, sheetAllowedDetents: "fitToContents" } as const;

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.blue, text: C.t1, border: "transparent" } };

function Gate() {
  const { status, user } = useAuth();
  const ready = status !== "loading";
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;
  const inside = status === "signedIn" || status === "guest";
  return (
    <SubscriptionProvider userId={user?.id || null}>
      <WishpoolProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Protected guard={inside}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="room/[id]" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="wish/new" options={LARGE_SHEET} />
            <Stack.Screen name="room/new" options={LARGE_SHEET} />
            <Stack.Screen name="wish/[id]" options={FIT_SHEET} />
            <Stack.Screen name="room/take" options={FIT_SHEET} />
            <Stack.Screen name="paywall" options={{ presentation: "fullScreenModal" }} />
          </Stack.Protected>
          <Stack.Protected guard={!inside}>
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="sign-in-options" options={FIT_SHEET} />
          </Stack.Protected>
        </Stack>
      </WishpoolProvider>
    </SubscriptionProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <LangProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <Gate />
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
