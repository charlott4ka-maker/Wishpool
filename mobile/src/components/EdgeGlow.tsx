// The Premium glow (Profile card, paywall, the locked photo tile): our dark
// block with a blue light rising from one edge: deep blue, then lighter blue,
// then a soft light right at the edge. Drawn as one SVG gradient with many
// eased stops so it melts in with no visible lines (three stacked native
// gradients showed bands).
import { useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

export type GlowSide = "bottom" | "top" | "corner";

// from the far side (t = 0) to the lit edge (t = 1)
const DIR: Record<GlowSide, { x1: number; y1: number; x2: number; y2: number }> = {
  bottom: { x1: 0, y1: 0, x2: 0, y2: 1 },
  top: { x1: 0, y1: 1, x2: 0, y2: 0 },
  corner: { x1: 1, y1: 1, x2: 0, y2: 0 },
};

const DEEP = [20, 76, 205], LIGHT = [102, 148, 255], EDGE = [200, 220, 255];
const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
// the colour and opacity at t: the three layers blended, each eased in
function at(t: number): [string, number] {
  const deep = 0.95 * smooth(0.3, 1, t);
  const light = 0.4 * smooth(0.55, 1, t);
  // the light right at the edge: narrow and clear, like the first version
  const edge = 0.6 * smooth(0.9, 1, t);
  const a = 1 - (1 - deep) * (1 - light) * (1 - edge);
  if (a <= 0.001) return ["#144CCD", 0];
  const mix = (i: number) => Math.round((DEEP[i] * deep + LIGHT[i] * light + EDGE[i] * edge) / (deep + light + edge || 1));
  const hex = "#" + [0, 1, 2].map((i) => mix(i).toString(16).padStart(2, "0")).join("");
  return [hex, a];
}
const STOPS = Array.from({ length: 41 }, (_, i) => i / 40).map((t) => [t, ...at(t)] as const);

export function EdgeGlow({ side }: { side: GlowSide }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const d = DIR[side];
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={`edge-${side}`} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}>
              {STOPS.map(([t, c, a]) => <Stop key={t} offset={t} stopColor={c} stopOpacity={a} />)}
            </LinearGradient>
          </Defs>
          <Rect width={size.w} height={size.h} fill={`url(#edge-${side})`} />
        </Svg>
      ) : null}
    </View>
  );
}
