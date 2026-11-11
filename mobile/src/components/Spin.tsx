// Turns its child round and round (a loading icon that shows it's working).
import { useEffect } from "react";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

export function Spin({ children, ms = 900 }: { children: React.ReactNode; ms?: number }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: ms, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(r);
  }, [ms]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
