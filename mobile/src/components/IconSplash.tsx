// The launch screen, drawn by the app: our dark page with the star of the
// app icon you picked (the classic one, or the Premium "Glow" star). iOS shows
// one fixed launch image for every icon, so the native splash is just the page
// colour (assets/splash-blank.png) and this takes over at once, then fades out
// when the app is ready (same moment the native splash used to hide).
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Image, StyleSheet } from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";

import { currentAppIcon } from "../subscription/appIcon";

let release: (() => void) | null = null;
let released = false;
/** Called once the app can be shown. */
export function releaseSplash() {
  released = true;
  release?.();
}

export function IconSplash() {
  const [shown, setShown] = useState(!released);
  const glow = currentAppIcon() === "Glow";
  useEffect(() => {
    release = () => setShown(false);
    if (released) setShown(false);
    return () => {
      release = null;
    };
  }, []);
  if (!shown) return null;
  return (
    <Animated.View
      exiting={FadeOut.duration(220)}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: "#15181D", alignItems: "center", justifyContent: "center", zIndex: 999 }]}
      // drawn: now the native splash (just the page colour) can go
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}
    >
      <Image
        source={glow ? require("../../assets/premium-star.png") : require("../../assets/splash-icon.png")}
        style={glow ? { width: 176, height: 168 } : { width: 200, height: 200 }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
