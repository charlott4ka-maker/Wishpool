// Third-party views don't take `className` until NativeWind is told to map it to `style`.
import { BlurView } from "expo-blur";
import { cssInterop } from "nativewind";

cssInterop(BlurView, { className: "style" });
