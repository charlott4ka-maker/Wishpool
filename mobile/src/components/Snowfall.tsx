// A few seconds of snow over the screen: the first time someone opens a Secret
// Santa room (whoever made it, and each friend the first time they come in).
// White lucide snowflakes drift down and sway a little; nothing bounces.
// Touches go straight through; it unmounts itself when done.

import { Snowflake } from "lucide-react-native";
import { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";

const FLAKES = 36;
const DURATION = 4200; // one fall
const TOTAL = 6000; // the last flakes start by ~1.6s

function Flake({ x, size, delay, drift, W, H }: { x: number; size: number; delay: number; drift: number; W: number; H: number }) {
  const y = useSharedValue(-40);
  const sway = useSharedValue(0);
  const turn = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withTiming(H + 40, { duration: DURATION + size * 60, easing: Easing.linear }));
    sway.value = withDelay(delay, withRepeat(withSequence(withTiming(drift, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(-drift, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1, true));
    turn.value = withDelay(delay, withTiming(360, { duration: DURATION, easing: Easing.linear }));
  }, [y, sway, turn, delay, drift, size, H]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x + sway.value }, { translateY: y.value }, { rotate: `${turn.value}deg` }],
    // fades in at the top and out near the bottom
    opacity: y.value < 0 ? 0 : y.value > H * 0.8 ? Math.max(0, 1 - (y.value - H * 0.8) / (H * 0.2)) : 0.9,
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, style]}>
      <Snowflake size={size} color="#fff" strokeWidth={1.5} absoluteStrokeWidth />
    </Animated.View>
  );
}

export function Snowfall({ onDone }: { onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const flakes = useMemo(
    () => Array.from({ length: FLAKES }, (_, i) => ({ id: i, x: Math.random() * (W - 20), size: 10 + Math.round(Math.random() * 14), delay: Math.random() * 1600, drift: 8 + Math.random() * 16 })),
    [W],
  );
  useEffect(() => {
    const t = setTimeout(onDone, TOTAL);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flakes.map((f) => (
        <Flake key={f.id} {...f} W={W} H={H} />
      ))}
    </View>
  );
}
