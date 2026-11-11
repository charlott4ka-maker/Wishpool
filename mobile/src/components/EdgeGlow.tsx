// The glow from the Profile Premium card, for the paywall: our dark page with
// a blue light rising from one edge in layers (deep blue, lighter blue, a
// thin light lip). Three sides to choose from.
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";

export type GlowSide = "bottom" | "top" | "corner";

const DIR: Record<GlowSide, { start: { x: number; y: number }; end: { x: number; y: number } }> = {
  // colours run from the far side (transparent) to the lit edge
  bottom: { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
  top: { start: { x: 0.5, y: 1 }, end: { x: 0.5, y: 0 } },
  corner: { start: { x: 1, y: 1 }, end: { x: 0, y: 0 } },
};
const fill = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

export function EdgeGlow({ side }: { side: GlowSide }) {
  const d = DIR[side];
  return (
    <View pointerEvents="none" style={fill}>
      <LinearGradient {...d} colors={["rgba(20,76,205,0)", "rgba(20,76,205,0.1)", "rgba(20,76,205,0.35)", "rgba(20,76,205,0.7)", "rgba(20,76,205,0.95)"]} locations={[0.35, 0.55, 0.72, 0.88, 1]} style={fill} />
      {/* the lighter blue and the light at the very edge, spread wide so they melt in */}
      <LinearGradient {...d} colors={["rgba(102,148,255,0)", "rgba(102,148,255,0.08)", "rgba(102,148,255,0.22)", "rgba(102,148,255,0.4)"]} locations={[0.55, 0.75, 0.9, 1]} style={fill} />
      <LinearGradient {...d} colors={["rgba(200,220,255,0)", "rgba(200,220,255,0.08)", "rgba(200,220,255,0.22)"]} locations={[0.8, 0.93, 1]} style={fill} />
    </View>
  );
}
