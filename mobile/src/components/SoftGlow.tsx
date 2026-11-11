// Smooth colour glows for dark screens (the paywall): soft radial blobs with
// many eased stops, so there are no visible bands or hard edges.
import { useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

type Blob = { color: string; cx: string; cy: string; r: string; alpha: number };

// an eased fall-off: lots of stops so the edge melts away
const FALL = [0, 0.1, 0.2, 0.32, 0.45, 0.6, 0.75, 0.88, 1];
const ease = (x: number) => Math.pow(1 - x, 2.2);

export function SoftGlow({ blobs }: { blobs: Blob[] }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }} onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            {blobs.map((b, i) => (
              <RadialGradient key={i} id={`g${i}`} cx={b.cx} cy={b.cy} rx={b.r} ry={b.r} fx={b.cx} fy={b.cy} gradientUnits="objectBoundingBox">
                {FALL.map((o) => <Stop key={o} offset={o} stopColor={b.color} stopOpacity={b.alpha * ease(o)} />)}
              </RadialGradient>
            ))}
          </Defs>
          {blobs.map((_, i) => <Rect key={i} width={size.w} height={size.h} fill={`url(#g${i})`} />)}
        </Svg>
      ) : null}
    </View>
  );
}
