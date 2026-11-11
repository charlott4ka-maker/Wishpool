// The Secret Santa type chip: the same chip as the others, only red with a
// snowflake. Picked: a soft red fill and outline, like the blue picked chip.
import { Snowflake } from "lucide-react-native";
import { View } from "react-native";

import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Press } from "./Press";
import { Txt } from "./ui";

const RED = "#FF6B7D";

export function SantaChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Press
      onPress={() => {
        haptic("select");
        onPress();
      }}
      className="h-sm flex-row items-center gap-1.5 rounded-full px-4"
      style={{ borderWidth: 1, borderColor: active ? "rgba(255,77,100,0.45)" : C.line, backgroundColor: active ? "rgba(255,77,100,0.16)" : "transparent" }}
    >
      <View style={{ marginTop: 1 }}>
        <Snowflake size={14} color={RED} strokeWidth={1.75} absoluteStrokeWidth />
      </View>
      <Txt className="font-m600 text-sm" style={{ color: RED }}>{label}</Txt>
    </Press>
  );
}
