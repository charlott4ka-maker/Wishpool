// The main action of a tall sheet, pinned to the bottom of the screen, with a
// fade above it (like the one under the settings header) so the form
// scrolling underneath melts into it. The sheet's ScrollView reserves
// SHEET_FOOTER_SPACE at its end so the last field can scroll clear of it.

import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C, H, hex } from "../theme/tokens";

const FADE = 32;
export const SHEET_FOOTER_SPACE = H.lg + 16 + FADE;

export function SheetFooter({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      <LinearGradient pointerEvents="none" colors={[hex(C.card, 0), C.card]} style={{ height: FADE }} />
      <View style={{ backgroundColor: C.card, paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}>{children}</View>
    </View>
  );
}
