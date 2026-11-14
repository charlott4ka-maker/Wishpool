// How to add our widgets (Premium › Widgets), like Mononote's explainer: a
// phone in a card where a widget grows from small to medium and swaps between
// Birthday and Secret Santa on a loop, and the steps under it.

import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Cake, ChevronLeft, Gift, Snowflake } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EdgeGlow } from "../components/EdgeGlow";
import { Sticker } from "../components/Sticker";
import { GlassCircle, Txt } from "../components/ui";
import { useT } from "../i18n";
import { C, hex, mixHex } from "../theme/tokens";
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
type Kind = "bday" | "folder" | "santa" | "santaFolder";
// TEMPORARY while she picks a birthday widget: the folder variant is in the loop too
const STEPS: { kind: Kind; wide: boolean }[] = [
  { kind: "folder", wide: false },
  { kind: "folder", wide: true },
  { kind: "santaFolder", wide: false },
  { kind: "santaFolder", wide: true },
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

/** a flip calendar card (FlipCard in Widgets.swift, her reference): dark bezel, grey card
 *  folded across the middle with hinges at the sides, a big light number, the unit under it */
function FlipCard({ big, unit, size, style }: { big: string; unit: string; size: number; style?: object }) {
  return (
    <View style={[{ borderRadius: 16, backgroundColor: "#101114", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 6 }, style]}>
      <View className="flex-1 items-center justify-center overflow-hidden" style={{ borderRadius: 11 }}>
        <LinearGradient colors={["#3A3C43", "#2B2D33"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <Txt className="font-m800" style={{ fontSize: size, lineHeight: size * 1.02, color: "#DADBDF" }}>{big}</Txt>
        <Txt className="font-m700" style={{ fontSize: Math.max(11, size * 0.24), color: "#A9ABB0", marginTop: -2 }}>{unit}</Txt>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: "42%", height: 2, backgroundColor: "rgba(0,0,0,0.55)" }} />
      </View>
      {/* the hinges */}
      <View pointerEvents="none" style={{ position: "absolute", left: 4, top: "34%", width: 4, height: "16%", borderRadius: 2, backgroundColor: "#9A9DA3" }} />
      <View pointerEvents="none" style={{ position: "absolute", right: 4, top: "34%", width: 4, height: "16%", borderRadius: 2, backgroundColor: "#9A9DA3" }} />
    </View>
  );
}

/** the birthday widget: the room colour's glow from the bottom, who, and the days on a flip
 *  card (full width on a small one; on a medium one bigger, on the right, the sticker left) */
function BdayFolder({ wide }: { wide: boolean }) {
  const { t } = useT();
  const head = (
    <View>
      <Txt numberOfLines={1} className="font-m600 text-[11px]" style={{ color: "rgba(255,255,255,0.65)" }}>{t("wgBday")}</Txt>
      <Txt numberOfLines={1} className="font-m800 text-white" style={{ fontSize: wide ? 22 : 16 }}>{t("wgDemoBdayName")}</Txt>
    </View>
  );
  return (
    <View className="flex-1" style={{ backgroundColor: C.raised }}>
      <EdgeGlow side="bottom" tint={BDAY_TINT} />
      {wide ? (
        <View className="flex-1 flex-row p-3.5" style={{ gap: 14 }}>
          <View className="flex-1 justify-between">
            {head}
            <Sticker emoji="stk:cake" size={50} rotate={-6} />
          </View>
          <FlipCard big="5" unit={t("wgDemoDays")} size={56} style={{ width: 150 }} />
        </View>
      ) : (
        <View className="flex-1 p-3" style={{ gap: 6 }}>
          {head}
          <FlipCard big="5" unit={t("wgDemoDays")} size={36} style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}

/** the birthday, variant 2 (BirthdayFolderView in Widgets.swift): a folder filling the widget
 *  like the app's folders: tall gift cards with a white edge peeking out of the back, a frosted
 *  front (a blur and the room colour), a soft bevel and a light lip, and a glass pill */
// snowflakes over the Santa folder (folderFlakes in Widgets.swift): x, y, size, opacity
const FOLDER_FLAKES: [number, number, number, number][] = [[0.08, 0.1, 14, 0.5], [0.92, 0.08, 12, 0.45], [0.15, 0.62, 10, 0.35], [0.86, 0.58, 13, 0.4], [0.5, 0.94, 8, 0.25], [0.33, 0.06, 9, 0.35], [0.7, 0.72, 9, 0.3]];
const GIFT_CARDS = ["stk:headphones", "stk:lipstick", "stk:book"];
function GiftFolder({ wide, santa }: { wide: boolean; santa?: boolean }) {
  const tint = santa ? "#8F2F3F" : BDAY_TINT;
  const cards = santa ? ["stk:camera", "stk:glassheart", "stk:disco"] : GIFT_CARDS;
  const { t } = useT();
  const w = wide ? MEDIUM : SMALL, h = H;
  const ch = h * (wide ? 0.66 : 0.6), cw = ch * 0.82;
  const spots: [number, number, number][] = wide ? [[0.22, 0.13, -10], [0.78, 0.11, 9], [0.5, 0.04, 0]] : [[0.3, 0.14, -10], [0.72, 0.12, 9], [0.5, 0.05, 0]];
  const yT = h * 0.42, yB = h * (wide ? 0.52 : 0.54), xt = w * (wide ? 0.42 : 0.5);
  const frost = (
    <>
      <BlurView intensity={40} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <LinearGradient colors={[hex(tint, 0.58), hex(tint, 0.4)]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
    </>
  );
  return (
    <View style={{ width: w, height: h, overflow: "hidden" }}>
      <LinearGradient colors={[mixHex(C.card, tint, 0.36), mixHex(C.card, tint, 0.26)]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      {spots.map(([x, y, r], i) => (
        <View key={i} style={{ position: "absolute", left: w * x - cw / 2, top: h * y, width: cw, height: ch, padding: 3, borderRadius: 10, backgroundColor: "#fff", transform: [{ rotate: `${r}deg` }] }}>
          <View className="flex-1 items-center justify-center overflow-hidden" style={{ borderRadius: 7 }}>
            <LinearGradient colors={["#F1F4F9", "#D9E0EB"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
            <Sticker emoji={cards[i]} size={cw * 0.8} />
          </View>
        </View>
      ))}
      {/* the front: the tab, then the body, both frosted */}
      <View style={{ position: "absolute", left: 0, top: yT, width: xt + 10, height: yB - yT + 24, borderTopRightRadius: 22, borderTopLeftRadius: 22, overflow: "hidden" }}>{frost}</View>
      <View style={{ position: "absolute", left: 0, right: 0, top: yB, bottom: 0, borderTopRightRadius: 18, overflow: "hidden" }}>{frost}</View>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: yB, height: 1.2, backgroundColor: "rgba(255,255,255,0.22)" }} />
      {santa
        ? FOLDER_FLAKES.map(([x, y, size, o], i) => (
            <View key={i} pointerEvents="none" style={{ position: "absolute", left: w * x - size / 2, top: h * y - size / 2, opacity: o }}>
              <Snowflake size={size} color="#fff" strokeWidth={1.5} absoluteStrokeWidth />
            </View>
          ))
        : null}
      <View className="absolute flex-row items-center self-center" style={{ bottom: wide ? 12 : 10, height: wide ? 36 : 30, paddingHorizontal: wide ? 14 : 9, gap: wide ? 6 : 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 0.5, borderColor: "rgba(255,255,255,0.25)", maxWidth: w - 16 }}>
        {santa ? <Gift size={wide ? 14 : 11} color="#fff" strokeWidth={2} /> : <Cake size={wide ? 14 : 11} color="#fff" strokeWidth={2} />}
        <Txt numberOfLines={1} className="font-m700 text-white" style={{ fontSize: wide ? 15 : santa ? 10.5 : 11.5, flexShrink: 1 }}>
          {santa ? `${wide ? t("wgYouGive") + " " : ""}${t("wgDemoSantaName")} · ${t("wgDemoSwapDays")}` : `${t("wgDemoBdayName")} · ${t("wgDemoIn")}`}
        </Txt>
      </View>
    </View>
  );
}

/** what the widget shows, small or wide (the same drawing as targets/widget/Widgets.swift):
 * the birthday as its room's folder; Secret Santa in the Premium card's look with a red glow */
function Face({ kind, wide }: { kind: Kind; wide: boolean }) {
  const { t } = useT();
  if (kind === "bday") return <BdayFolder wide={wide} />;
  if (kind === "folder") return <GiftFolder wide={wide} />;
  if (kind === "santaFolder") return <GiftFolder wide={wide} santa />;
  const name = t("wgDemoSantaName");
  return (
    <View className="flex-1" style={{ backgroundColor: C.raised }}>
      <EdgeGlow side="bottom" tone="red" />
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
