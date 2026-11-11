// The Secret Santa type chip: stands out like the premium tab, in a festive red.
// Picked: a raised red pill (#E5233B to #FF5A6E, a soft light lip, a snowflake);
// not picked: red text and a snowflake on the plain chip outline.
import { LinearGradient } from "expo-linear-gradient";
import { Snowflake } from "lucide-react-native";
import { View } from "react-native";

import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Press } from "./Press";
import { Txt } from "./ui";

export function SantaChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Press
      onPress={() => {
        haptic("select");
        onPress();
      }}
      className="h-sm flex-row items-center gap-1.5 overflow-hidden rounded-full px-4"
      style={{ borderWidth: active ? 0 : 1, borderColor: active ? "transparent" : C.line }}
    >
      {active ? (
        <>
          <LinearGradient colors={["#D81E36", "#FF5A6E"]} start={{ x: 0.2, y: 1 }} end={{ x: 0.8, y: 0 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <LinearGradient colors={["rgba(255,190,200,0.6)", "rgba(255,190,200,0)"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.25 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        </>
      ) : null}
      <View style={{ marginTop: 1 }}>
        <Snowflake size={15} color={active ? "#fff" : "#FF6B7D"} strokeWidth={1.75} absoluteStrokeWidth />
      </View>
      <Txt className="font-m600 text-sm" style={{ color: active ? "#fff" : "#FF6B7D" }}>{label}</Txt>
    </Press>
  );
}
