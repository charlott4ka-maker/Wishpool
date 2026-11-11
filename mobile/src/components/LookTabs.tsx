// Tabs for the folder look sheet (Sticker / Colour / Folders). The premium tab,
// once on, is a raised blue pill like her button: a #0A82F9 to #55A9FC gradient
// (darker at the bottom left), a 1px #459FF8 lip along the top and a soft
// #459FF8 glow inside the right edge, with a crown. It follows the app colour
// (those are the blue values; other accents get the same mix).
import { LinearGradient } from "expo-linear-gradient";
import { Crown } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { haptic } from "../lib/haptics";
import { useAccent } from "../theme/accent";
import { C, hex, mixHex } from "../theme/tokens";
import { Txt } from "./ui";

const SEG_ON = "#353C49";

export function LookTabs<K extends string>({ options, value, onChange, premium }: { options: [K, string][]; value: K; onChange: (k: K) => void; premium?: K }) {
  const acc = useAccent();
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
            // sized by their labels (the longer "Custom" with its crown gets more room), all filling the row
            className="overflow-hidden rounded-full px-4"
            style={{ flexGrow: 1, flexBasis: "auto", backgroundColor: on && !prem ? SEG_ON : "transparent" }}
          >
            {on && prem ? (
              <>
                <LinearGradient colors={[acc.base, mixHex(acc.base, "#ffffff", 0.3)]} start={{ x: 0.2, y: 1 }} end={{ x: 0.8, y: 0 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                <LinearGradient colors={[hex(mixHex(acc.base, "#ffffff", 0.2), 0), hex(mixHex(acc.base, "#ffffff", 0.2), 0.52)]} start={{ x: 0.88, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                {/* the lip along the top: a soft inner shadow, fading down */}
                <LinearGradient colors={[hex(mixHex(acc.base, "#ffffff", 0.45), 0.7), hex(mixHex(acc.base, "#ffffff", 0.45), 0)]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.22 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
              </>
            ) : null}
            <View className="flex-1 flex-row items-center justify-center gap-1.5">
              {/* lifted a touch: the crown box centre sits 2pt below the letters, measured */}
              {prem ? <View style={{ marginTop: -1.5 }}><Crown size={15} color={on ? "#fff" : C.blueText} fill={on ? "#fff" : "transparent"} strokeWidth={1.5} absoluteStrokeWidth /></View> : null}
              <Txt className={`font-m600 text-sm ${on ? "text-white" : prem ? "text-blueText" : "text-t2"}`}>{label}</Txt>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
