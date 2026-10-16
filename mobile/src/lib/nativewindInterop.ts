// Third-party views don't take `className` until NativeWind is told to map it to `style`.
// Reanimated's Animated.View is NOT mapped: animated views get plain `style` only
// (mapping it broke styles on device).
import { BlurView } from "expo-blur";
import { cssInterop } from "nativewind";

cssInterop(BlurView, { className: "style" });
