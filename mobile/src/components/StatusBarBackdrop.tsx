// Black strip under the status bar so content scrolling up doesn't run into
// the clock and battery (the tab screens have no native bar of their own).

import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "../theme/tokens";

export function StatusBarBackdrop() {
  const insets = useSafeAreaInsets();
  return <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: C.bg }} />;
}
