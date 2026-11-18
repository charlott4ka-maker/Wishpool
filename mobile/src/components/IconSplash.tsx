// The launch screen, drawn by the app: our dark page with the star of the
// app icon you picked (the classic one, or the Premium "Glow" star). iOS shows
// one fixed launch image for every icon, so the native splash is just the page
// colour (assets/splash-blank.png) and this takes over at once, then fades out
// when the app is ready (same moment the native splash used to hide).
//
// The star comes in like the App Store promo (2026-11-18): it sharpens out of a
// blur while a soft blue glow rises behind it. No tile, no outline, no text.
// The app waits for the animation to finish (about a second) before it shows.
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { currentAppIcon } from "../subscription/appIcon";

let release: (() => void) | null = null;
let released = false;
/** Called once the app can be shown. */
export function releaseSplash() {
  released = true;
  release?.();
}

const INTRO = 1000; // the star has sharpened by then
const ease = Easing.out(Easing.cubic);

export function IconSplash() {
  const [shown, setShown] = useState(!released);
  const glow = currentAppIcon() === "Glow";
  const born = useRef(Date.now());
  const p = useSharedValue(0); // 0 blurred and hidden, 1 sharp
  const g = useSharedValue(0); // the glow behind
  useEffect(() => {
    p.value = withDelay(120, withTiming(1, { duration: 820, easing: ease }));
    g.value = withTiming(1, { duration: 900, easing: ease });
    // never cut the intro short: hide at "ready", but not before it has played
    const hide = () => {
      const left = INTRO - (Date.now() - born.current);
      if (left > 0) setTimeout(() => setShown(false), left);
      else setShown(false);
    };
    release = hide;
    if (released) hide();
    return () => {
      release = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sharp = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.9 + 0.1 * p.value }] }));
  const soft = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 3) * (1 - p.value), transform: [{ scale: 0.9 + 0.1 * p.value }] }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.85 * g.value, transform: [{ scale: 0.8 + 0.2 * g.value }] }));

  if (!shown) return null;
  const size = glow ? { width: 176, height: 168 } : { width: 200, height: 200 };
  return (
    <Animated.View
      exiting={FadeOut.duration(220)}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: "#15181D", alignItems: "center", justifyContent: "center", zIndex: 999 }]}
      // drawn: now the native splash (just the page colour) can go
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}
    >
      {/* the soft blue glow rising behind the star */}
      <Animated.View style={[{ position: "absolute", width: 420, height: 420 }, halo]}>
        <Svg width={420} height={420}>
          <Defs>
            <RadialGradient id="splashGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#0A82F9" stopOpacity={0.55} />
              <Stop offset="0.45" stopColor="#0A6BE0" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#0A6BE0" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={420} height={420} fill="url(#splashGlow)" />
        </Svg>
      </Animated.View>
      <View style={size}>
        {/* first a blurred star (the blurred picture is 1.5x wider: room for the blur) */}
        <Animated.View style={[{ position: "absolute", left: -size.width * 0.25, top: -size.height * 0.25, width: size.width * 1.5, height: size.height * 1.5 }, soft]}>
          <Image source={glow ? require("../../assets/premium-star-blur.png") : require("../../assets/splash-icon-blur.png")} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
        </Animated.View>
        {/* then the sharp one over it */}
        <Animated.View style={[StyleSheet.absoluteFill, sharp]}>
          <Image source={glow ? require("../../assets/premium-star.png") : require("../../assets/splash-icon.png")} style={size} resizeMode="contain" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}
