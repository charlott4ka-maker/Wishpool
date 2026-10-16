// iOS-style press: the thing shrinks a little while the finger is down and
// springs back on release (Reanimated, runs on the UI thread). Drop-in for
// Pressable, takes className / style the same way.

import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import { cssInterop } from "nativewind";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: "style" });

const SPRING = { damping: 15, stiffness: 320, mass: 0.6 };

export type PressProps = PressableProps & {
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** How small it gets while pressed (0.96 buttons, 0.97 cards). */
  scaleTo?: number;
  /** Also dims a bit while pressed. */
  dim?: boolean;
};

export function Press({ scaleTo = 0.96, dim = false, onPressIn, onPressOut, style, disabled, ...rest }: PressProps) {
  const s = useSharedValue(1);
  const o = useSharedValue(1);
  // opacity only when dimming, so a disabled button's own opacity isn't overridden
  const anim = useAnimatedStyle(() => (dim ? { transform: [{ scale: s.value }], opacity: o.value } : { transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        s.value = withSpring(scaleTo, SPRING);
        if (dim) o.value = withTiming(0.85, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, SPRING);
        if (dim) o.value = withTiming(1, { duration: 160 });
        onPressOut?.(e);
      }}
      style={[style as ViewStyle, anim]}
    />
  );
}
