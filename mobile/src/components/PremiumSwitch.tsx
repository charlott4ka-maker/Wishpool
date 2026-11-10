// Plain / Premium switch for the room form: the Premium half, once on, is a raised
// pill in our blues (the logo blue #047DFB to sky #38BDF8) with a crown, a light lip
// along the top and a pale blue glow on the left edge (inner shadows, like her reference).
import { LinearGradient } from "expo-linear-gradient";
import { Crown } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Txt } from "./ui";

const SEG_ON = "#353C49";

export function PremiumSwitch({ value, onChange, plainLabel, premiumLabel }: { value: "plain" | "premium"; onChange: (v: "plain" | "premium") => void; plainLabel: string; premiumLabel: string }) {
  const pick = (v: "plain" | "premium") => {
    if (v !== value) haptic("select");
    onChange(v);
  };
  const prem = value === "premium";
  return (
    <View className="h-lg flex-row gap-1 rounded-full p-1.5" style={{ backgroundColor: C.bg }}>
      <Pressable onPress={() => pick("plain")} className="flex-1 items-center justify-center rounded-full" style={{ backgroundColor: prem ? "transparent" : SEG_ON }}>
        <Txt className={`font-m600 text-sm ${prem ? "text-t2" : "text-white"}`}>{plainLabel}</Txt>
      </Pressable>
      <Pressable onPress={() => pick("premium")} className="flex-1 overflow-hidden rounded-full">
        {prem ? (
          <>
            <LinearGradient colors={["#0A6CF0", "#2EA8F5"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
            {/* the left inner glow */}
            <LinearGradient colors={["rgba(150,205,255,0.4)", "rgba(150,205,255,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 0.08, y: 0.5 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
            {/* the light lip along the top: a thin line just inside the edge */}
            <View style={{ position: "absolute", top: 1.5, left: 22, right: 22, height: 1, borderRadius: 1, backgroundColor: "rgba(210,236,255,0.45)" }} />
          </>
        ) : null}
        <View className="flex-1 flex-row items-center justify-center gap-1.5">
          <Crown size={16} color={prem ? "#fff" : C.blueText} fill={prem ? "#fff" : "transparent"} strokeWidth={1.5} absoluteStrokeWidth />
          <Txt className="font-m700 text-sm" style={{ color: prem ? "#fff" : C.blueText }}>{premiumLabel}</Txt>
        </View>
      </Pressable>
    </View>
  );
}
