// iOS-style press: the thing shrinks a little while the finger is down and
// springs back on release (Reanimated, on the UI thread).
//
// The styled element is a plain Pressable (NativeWind styles it reliably); the
// spring runs on an Animated.View around it that only carries the transform.
// Layout classes that decide how the element sits in its parent (flex-1,
// w-full, self-start/center) are mirrored onto that wrapper. Absolutely
// positioned buttons stay plain Pressables, without the spring.

import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

const SPRING = { damping: 15, stiffness: 320, mass: 0.6 };

export type PressProps = PressableProps & {
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** How small it gets while pressed (0.96 buttons, 0.97 cards). */
  scaleTo?: number;
  /** Also dims a bit while pressed. */
  dim?: boolean;
};

function wrapperLayout(cls: string): ViewStyle {
  const has = (c: string) => new RegExp(`(^|\\s)${c}(\\s|$)`).test(cls);
  return {
    ...(has("flex-1") ? { flex: 1 } : null),
    ...(has("w-full") ? { width: "100%" } : null),
    ...(has("self-start") ? { alignSelf: "flex-start" } : null),
    ...(has("self-center") ? { alignSelf: "center" } : null),
  };
}

export function Press({ scaleTo = 0.96, dim = false, onPressIn, onPressOut, className = "", disabled, ...rest }: PressProps) {
  const s = useSharedValue(1);
  const o = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: o.value }));
  if (/(^|\s)absolute(\s|$)/.test(className)) return <Pressable {...rest} disabled={disabled} className={className} onPressIn={onPressIn} onPressOut={onPressOut} />;
  return (
    <Animated.View style={[wrapperLayout(className), anim]}>
      <Pressable
        {...rest}
        disabled={disabled}
        // flex-1 on the inner Pressable would mean flex-basis 0 in the column
        // wrapper and collapse its height in a row; grow keeps the content height
        className={className.replace(/(^|\s)(self-start|self-center)(?=\s|$)/g, " ").replace(/(^|\s)flex-1(?=\s|$)/g, " grow")}
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
      />
    </Animated.View>
  );
}
