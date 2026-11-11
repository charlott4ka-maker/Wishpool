// "Your own colour" for a room (Premium): the iPhone's own colour picker
// (SwiftUI ColorPicker from @expo/ui: grid, spectrum, sliders, eyedropper).
// Without Premium the row shows a lock and opens the paywall. Only where the
// native picker is in the build (iOS); hidden elsewhere.
import { requireOptionalNativeModule } from "expo";
import { Lock } from "lucide-react-native";
import { Platform, Pressable, View } from "react-native";
import Svg, { Circle, Defs, Stop, LinearGradient } from "react-native-svg";

import { C } from "../theme/tokens";
import { Txt } from "./ui";

const NATIVE = Platform.OS === "ios" && !!requireOptionalNativeModule("ExpoUI");
type UI = typeof import("@expo/ui/swift-ui");
const ui: UI | null = NATIVE ? (require("@expo/ui/swift-ui") as UI) : null;

export const customColorAvailable = NATIVE;

export function CustomColor({ value, picked, label, unlocked, onChange, onLocked }: {
  /** the room colour now */ value: string;
  /** true when it's a custom one (not one of the swatches) */ picked: boolean;
  label: string;
  unlocked: boolean;
  onChange: (hex: string) => void;
  onLocked: () => void;
}) {
  if (!ui) return null;
  const { Host, ColorPicker } = ui;
  return (
    <Pressable onPress={unlocked ? undefined : onLocked} className="mb-4 h-lg flex-row items-center gap-3 rounded-tile bg-raised px-4">
      {/* a rainbow ring until a colour is picked, then that colour */}
      <Svg width={28} height={28} viewBox="0 0 28 28">
        <Defs>
          <LinearGradient id="cc-rainbow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FF4D8D" />
            <Stop offset="0.35" stopColor="#FFB020" />
            <Stop offset="0.65" stopColor="#34C759" />
            <Stop offset="1" stopColor="#0A82F9" />
          </LinearGradient>
        </Defs>
        <Circle cx={14} cy={14} r={12.5} fill={picked ? value : "url(#cc-rainbow)"} stroke={picked ? "#fff" : "none"} strokeWidth={picked ? 2 : 0} />
      </Svg>
      <Txt className="flex-1 font-m600 text-[15px]">{label}</Txt>
      {unlocked ? (
        <Host matchContents>
          <ColorPicker selection={picked ? value : null} supportsOpacity={false} onSelectionChange={(c) => onChange(c.slice(0, 7).toUpperCase())} />
        </Host>
      ) : (
        <View className="h-sm w-sm items-center justify-center">
          <Lock size={18} color={C.t2} strokeWidth={1.5} absoluteStrokeWidth />
        </View>
      )}
    </Pressable>
  );
}
