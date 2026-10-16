import "react-native-url-polyfill/auto";
import "../global.css";
import "../lib/nativewindInterop";

// Only the four weights we use (500 is the lightest), not the whole family.
import { Montserrat_500Medium } from "@expo-google-fonts/montserrat/500Medium";
import { Montserrat_600SemiBold } from "@expo-google-fonts/montserrat/600SemiBold";
import { Montserrat_700Bold } from "@expo-google-fonts/montserrat/700Bold";
import { Montserrat_800ExtraBold } from "@expo-google-fonts/montserrat/800ExtraBold";
import { useFonts } from "expo-font";
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

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.blue, text: C.t1, border: "transparent" } };

function Gate() {
  const { status, user } = useAuth();
  const [fontsLoaded] = useFonts({ Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold });
  const ready = fontsLoaded && status !== "loading";
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
            <Stack.Screen name="wish/new" options={{ presentation: "formSheet", sheetGrabberVisible: true, sheetCornerRadius: 32, contentStyle: { backgroundColor: C.card } }} />
            <Stack.Screen name="room/new" options={{ presentation: "formSheet", sheetGrabberVisible: true, sheetCornerRadius: 32, contentStyle: { backgroundColor: C.card } }} />
            <Stack.Screen name="paywall" options={{ presentation: "formSheet", sheetGrabberVisible: true, sheetCornerRadius: 32, contentStyle: { backgroundColor: C.card } }} />
          </Stack.Protected>
          <Stack.Protected guard={!inside}>
            <Stack.Screen name="sign-in" />
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
