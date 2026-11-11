// Tabs for the folder look sheet (Sticker / Colour / Folders). The premium tab,
// once on, is a raised blue pill like her button: a #0A82F9 to #55A9FC gradient
// (darker at the bottom left), a 1px #459FF8 lip along the top and a soft
// #459FF8 glow inside the right edge, with a crown.
import { LinearGradient } from "expo-linear-gradient";
import { Crown } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Txt } from "./ui";

const SEG_ON = "#353C49";

export function LookTabs<K extends string>({ options, value, onChange, premium }: { options: [K, string][]; value: K; onChange: (k: K) => void; premium?: K }) {
  return (
    <View className="h-lg flex-row gap-1 rounded-full p-1.5" style={{ backgroundColor: C.bg }}>
      {options.map(([k, label]) => {
        const on = value === k;
        const prem = k === premium;
        return (
          <Pressable
            key={k}
            onPress={() => {
              if (!on) haptic("select");
              onChange(k);
            }}
            className="flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: on && !prem ? SEG_ON : "transparent" }}
          >
            {on && prem ? (
              <>
                <LinearGradient colors={["#0A82F9", "#55A9FC"]} start={{ x: 0.2, y: 1 }} end={{ x: 0.8, y: 0 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                <LinearGradient colors={["rgba(69,159,248,0)", "rgba(69,159,248,0.52)"]} start={{ x: 0.88, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                <View style={{ position: "absolute", top: 1, left: 16, right: 16, height: 1, backgroundColor: "#459FF8" }} />
              </>
            ) : null}
            <View className="flex-1 flex-row items-center justify-center gap-1.5">
              {prem ? <Crown size={15} color={on ? "#fff" : C.blueText} fill={on ? "#fff" : "transparent"} strokeWidth={1.5} absoluteStrokeWidth /> : null}
              <Txt className={`font-m600 text-sm ${on ? "text-white" : prem ? "text-blueText" : "text-t2"}`}>{label}</Txt>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
