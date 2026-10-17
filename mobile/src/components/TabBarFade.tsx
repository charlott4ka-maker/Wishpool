// Dark fade along the bottom of a tab screen, under the system tab bar, so
// content scrolling beneath the bar fades out instead of blending into it.
// Block fill: the content block runs down under the bar.

import { LinearGradient } from "expo-linear-gradient";
import { C, hex } from "../theme/tokens";

export function TabBarFade() {
  // tab bar (49) + home indicator (34) + ~56 above the bar
  const height = 140;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[hex(C.card, 0), hex(C.card, 0.75), C.card]}
      locations={[0, 0.45, 1]}
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, height }}
    />
  );
}
