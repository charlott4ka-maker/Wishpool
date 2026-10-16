// Third-party views don't take `className` until NativeWind is told to map it to `style`.
import { BlurView } from "expo-blur";
import { cssInterop } from "nativewind";
import Animated from "react-native-reanimated";

cssInterop(BlurView, { className: "style" });
cssInterop(Animated.View, { className: "style" });
