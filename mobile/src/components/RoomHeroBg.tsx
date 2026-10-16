// The room hero's mesh background from the Mini App (roomHeroBg): soft light
// behind the sticker, a lighter shade of the room colour from the top left, a
// deeper one from the bottom right, over the room tint. Drawn with SVG
// radial gradients so it matches the web CSS.

import { useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { mixHex } from "../theme/tokens";

/** Top colour of the hero (heroTop in the Mini App). */
export function heroTop(tint: string): string {
  const c = [0, 2, 4].map((k) => parseInt(tint.replace("#", "").slice(k, k + 2), 16));
  return "#" + c.map((v) => Math.round(13 + (v - 13) * 0.72).toString(16).padStart(2, "0")).join("");
}

function hueShift(tint: string, deg: number): string {
  let [r, g, b] = [0, 2, 4].map((k) => parseInt(tint.replace("#", "").slice(k, k + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  h = (h + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [R1, G1, B1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [R1, G1, B1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

const hueOf = (c: string) => {
  const [r, g, b] = [0, 2, 4].map((k) => parseInt(c.replace("#", "").slice(k, k + 2), 16));
  return ((Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180) / Math.PI + 360) % 360;
};

export function RoomHeroBg({ tint }: { tint: string }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const cool = hueOf(tint) >= 180;
  const a = mixHex(hueShift(tint, cool ? -10 : 10), "#ffffff", 0.22);
  const b = mixHex(hueShift(tint, cool ? 8 : -8), "#000000", 0.2);
  const top = heroTop(tint);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }} onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <RadialGradient id="base" cx="50%" cy="30%" rx="120%" ry="90%" fx="50%" fy="30%">
              <Stop offset="0" stopColor={tint} stopOpacity={0.9} />
              <Stop offset="0.55" stopColor={tint} stopOpacity={0.6} />
              <Stop offset="1" stopColor={tint} stopOpacity={0.35} />
            </RadialGradient>
            <RadialGradient id="tl" cx="0%" cy="10%" rx="70%" ry="60%" fx="0%" fy="10%">
              <Stop offset="0" stopColor={a} stopOpacity={0.75} />
              <Stop offset="1" stopColor={a} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="br" cx="100%" cy="95%" rx="75%" ry="65%" fx="100%" fy="95%">
              <Stop offset="0" stopColor={b} stopOpacity={0.7} />
              <Stop offset="1" stopColor={b} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="light" cx="50%" cy="30%" rx="42%" ry="34%" fx="50%" fy="30%">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.2} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id="topfade" x1="0" y1="0" x2="0" y2={Math.min(1, 120 / size.h)}>
              <Stop offset="0" stopColor={top} stopOpacity={1} />
              <Stop offset="1" stopColor={top} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={size.w} height={size.h} fill="#0d0d10" />
          <Rect width={size.w} height={size.h} fill="url(#base)" />
          <Rect width={size.w} height={size.h} fill="url(#br)" />
          <Rect width={size.w} height={size.h} fill="url(#tl)" />
          <Rect width={size.w} height={size.h} fill="url(#light)" />
          <Rect width={size.w} height={size.h} fill="url(#topfade)" />
        </Svg>
      ) : null}
    </View>
  );
}
