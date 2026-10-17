// The system Liquid Glass (iOS 26) through expo-glass-effect, loaded lazily
// so an older iOS or a client without the module falls back to our blur.

import type { ComponentType } from "react";
import { Platform } from "react-native";
import type { GlassViewProps } from "expo-glass-effect";

let glass: ComponentType<GlassViewProps> | null = null;
if (Platform.OS === "ios") {
  try {
    const mod = require("expo-glass-effect") as typeof import("expo-glass-effect");
    if (mod.isLiquidGlassAvailable()) glass = mod.GlassView;
  } catch {
    glass = null;
  }
}

/** The native glass view, or null when Liquid Glass isn't available. */
export const LiquidGlass = glass;
