// How to add our widgets (Premium › Widgets), like Mononote's explainer: a
// phone in a card where a widget grows from small to medium and swaps between
// Birthday and Secret Santa on a loop, and the steps under it.

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ChevronLeft, Snowflake } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Svg, { Defs, LinearGradient as SvgGradient, Path, Rect, Stop } from "react-native-svg";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SantaGlow } from "../components/EdgeGlow";
import { Sticker } from "../components/Sticker";
import { GlassCircle, Txt } from "../components/ui";
import { useT } from "../i18n";
import { C, mixHex } from "../theme/tokens";
import { useAccent } from "../theme/accent";

const SMALL = 132; // a small widget, the phone mockup's scale
const MEDIUM = 288;
const H = 132;
const BDAY_TINT = "#FF4D8D"; // the demo birthday room's colour
// snowflakes on the Santa widget, as fractions of its box: x, y, size, opacity (the same in Widgets.swift)
export const FLAKES: [number, number, number, number][] = [
  [0.9, 0.1, 16, 0.35], [0.82, 0.34, 10, 0.22], [0.95, 0.5, 12, 0.26], [0.86, 0.72, 8, 0.18], [0.97, 0.28, 8, 0.18], [0.76, 0.12, 9, 0.2],
];
const EASE = Easing.bezier(0.3, 0, 0.2, 1);
// the loop: birthday small, birthday medium, santa small, santa medium
const STEPS: { kind: "bday" | "santa"; wide: boolean }[] = [
  { kind: "bday", wide: false },
  { kind: "bday", wide: true },
  { kind: "santa", wide: false },
  { kind: "santa", wide: true },
];

function Avatar({ letter, tint, size }: { letter: string; tint: string; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
      <Txt className="font-m700 text-white" style={{ fontSize: size * 0.42 }}>{letter}</Txt>
    </View>
  );
}

/** the folder geometry as fractions of the widget (the same as FolderGeo in Widgets.swift) */
const geo = (wide: boolean) => ({ x0: 0.035, x1: 0.965, yT: 0.2, yB: 0.33, y1: 0.965, xt: wide ? 0.42 : 0.88 });
function frontPath(w: number, h: number, wide: boolean) {
  const g = geo(wide);
  const x0 = w * g.x0, x1 = w * g.x1, yT = h * g.yT, yB = h * g.yB, y1 = h * g.y1, xt = w * g.xt;
  const r = Math.min(w, h) * 0.13, rt = Math.min(w, h) * 0.09;
  return `M ${x0} ${yT + rt} Q ${x0} ${yT} ${x0 + rt} ${yT} L ${xt - 10} ${yT} C ${xt} ${yT} ${xt} ${yB} ${xt + 12} ${yB} L ${x1 - r} ${yB} Q ${x1} ${yB} ${x1} ${yB + r} L ${x1} ${y1 - r} Q ${x1} ${y1} ${x1 - r} ${y1} L ${x0 + r} ${y1} Q ${x0} ${y1} ${x0} ${y1 - r} Z`;
}

/** the birthday widget: a real room folder in the room's colour, the title on its tab */
function BdayFolder({ wide }: { wide: boolean }) {
  const { t } = useT();
  const w = wide ? MEDIUM : SMALL, h = H, g = geo(wide);
  const name = t("wgDemoBdayName");
  return (
    <View style={{ width: w, height: h, backgroundColor: C.card }}>
      <Svg width={w} height={h} style={{ position: "absolute" }}>
        <Defs>
          <SvgGradient id={`front-${wide}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={mixHex(C.card, BDAY_TINT, 0.62)} />
            <Stop offset="1" stopColor={mixHex(C.card, BDAY_TINT, 0.42)} />
          </SvgGradient>
        </Defs>
        <Rect x={w * 0.07} y={h * 0.06} width={w * 0.86} height={h * 0.86} rx={Math.min(w, h) * 0.12} fill={mixHex(C.card, BDAY_TINT, 0.32)} />
        <Path d={frontPath(w, h, wide)} fill={`url(#front-${wide})`} />
        <Path d={frontPath(w, h, wide)} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
      </Svg>
      {/* the title on the tab */}
      <View style={{ position: "absolute", left: w * g.x0 + 12, top: h * g.yT, height: h * (g.yB - g.yT), width: w * (g.xt - g.x0) - 16, justifyContent: "center" }}>
        <Txt numberOfLines={1} className="font-m700 text-white" style={{ fontSize: wide ? 11 : 10 }}>{t("wgBday")}</Txt>
      </View>
      <View className="flex-row items-center" style={{ position: "absolute", left: w * g.x0, top: h * g.yB, width: w * (g.x1 - g.x0), height: h * (g.y1 - g.yB), paddingHorizontal: 14 }}>
        <View className="flex-1" style={{ gap: wide ? 6 : 4 }}>
          <View className="flex-row items-center gap-2">
            <Avatar letter={name[0]} tint="rgba(255,255,255,0.22)" size={wide ? 38 : 28} />
            <Txt numberOfLines={1} className="font-m800 text-white" style={{ fontSize: wide ? 18 : 14, flexShrink: 1 }}>{name}</Txt>
          </View>
          <Txt numberOfLines={1} className="font-m800 text-white" style={{ fontSize: wide ? 24 : 19 }}>{t("wgDemoIn")}</Txt>
        </View>
        {wide ? <Sticker emoji="stk:cake" size={62} rotate={-6} /> : null}
      </View>
    </View>
  );
}

/** what the widget shows, small or wide (the same drawing as targets/widget/Widgets.swift):
 * the birthday as its room's folder; Secret Santa in the Premium card's look with a red glow */
function Face({ kind, wide }: { kind: "bday" | "santa"; wide: boolean }) {
  const { t } = useT();
  if (kind === "bday") return <BdayFolder wide={wide} />;
  const name = t("wgDemoSantaName");
  return (
    <View className="flex-1" style={{ backgroundColor: C.raised }}>
      <SantaGlow />
      {FLAKES.map(([x, y, size, o], i) => (
        <View key={i} pointerEvents="none" style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, opacity: o, transform: [{ translateX: -size / 2 }] }}>
          <Snowflake size={size} color="#fff" strokeWidth={1.5} absoluteStrokeWidth />
        </View>
      ))}
      <View className="flex-1 flex-row items-center p-3.5">
        <View className="flex-1 self-stretch justify-between">
          <Txt className="font-m700 text-[12px] text-white">{t("wgSanta")}</Txt>
          <View className={`flex-row items-center ${wide ? "gap-2.5" : "gap-2"}`}>
            <Avatar letter={name[0]} tint="#0A82F9" size={wide ? 46 : 26} />
            <View className="flex-1">
              <Txt numberOfLines={1} className="font-m600 text-[11px]" style={{ color: "rgba(255,255,255,0.8)" }}>{t("wgYouGive")}</Txt>
              <Txt numberOfLines={1} className="font-m800 text-white" style={{ fontSize: wide ? 20 : 15 }}>{name}</Txt>
            </View>
          </View>
          <Txt numberOfLines={1} className="font-m800 text-[12px] text-white">{t(wide ? "wgDemoSwap" : "wgDemoSwapShort")}</Txt>
        </View>
        {/* the room's sticker on the right of a medium widget only */}
        {wide ? <Sticker emoji="stk:santa" size={62} rotate={-6} /> : null}
      </View>
    </View>
  );
}

export default function WidgetsScreen() {
  useAccent();
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const width = useSharedValue(SMALL);
  const fade = useSharedValue(1);

  // grow / shrink, then swap the face while it is faded down a touch
  useEffect(() => {
    const s = STEPS[step];
    width.value = withTiming(s.wide ? MEDIUM : SMALL, { duration: 650, easing: EASE });
    fade.value = 0;
    fade.value = withTiming(1, { duration: 420, easing: EASE });
    const timer = setTimeout(() => setStep((i) => (i + 1) % STEPS.length), 2200);
    return () => clearTimeout(timer);
  }, [step, width, fade]);

  const box = useAnimatedStyle(() => ({ width: width.value }));
  const face = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * fade.value }));
  const s = STEPS[step];

  return (
    <View className="flex-1 bg-card">
      <View className="flex-row items-center px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <GlassCircle onPress={() => router.back()} label={t("back")}>
          <SymbolView name="chevron.left" size={19} weight="semibold" tintColor={C.t1} fallback={<ChevronLeft size={22} color={C.t1} />} />
        </GlassCircle>
        <View pointerEvents="none" className="absolute bottom-2 left-0 right-0 h-sm items-center justify-center">
          <Txt className="font-m700 text-[17px]">{t("perkWidgets")}</Txt>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <View className="overflow-hidden rounded-card bg-raised pt-6">
          {/* the phone, cut off at the bottom like Apple's own explainers */}
          <View className="mx-6 overflow-hidden" style={{ height: 300, borderTopLeftRadius: 44, borderTopRightRadius: 44, backgroundColor: "#262B33" }}>
            <View className="self-center" style={{ marginTop: 14, width: 96, height: 28, borderRadius: 14, backgroundColor: "#15181D" }} />
            <View style={{ marginTop: 36, marginLeft: 18 }}>
              <Animated.View style={[{ height: H, borderRadius: 26, overflow: "hidden", backgroundColor: C.card, borderWidth: 0.5, borderColor: "rgba(255,255,255,0.08)" }, box]}>
                <Animated.View style={[{ flex: 1 }, face]}>
                  <Face kind={s.kind} wide={s.wide} />
                </Animated.View>
              </Animated.View>
            </View>
            {/* the phone fades into the card at the bottom */}
            <LinearGradient pointerEvents="none" colors={["rgba(30,34,40,0)", C.raised]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90 }} />
          </View>
          <View className="px-5 pb-6 pt-5">
            <Txt className="font-m700 text-[18px]">{t("wgHowTitle")}</Txt>
            <Txt className="mt-2 text-[15px] leading-[21px] text-t2">{t("wgHowText")}</Txt>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
