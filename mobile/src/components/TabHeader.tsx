// Header of a tab screen: our 26pt title with the round "+" and, on Wishes,
// the search field, on its own dark fill with a hairline along the bottom
// (like the iOS bar). It stays put; the list scrolls in the area below it.

import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenTitle } from "./ui";

export function TabHeader({ title, right, children }: { title: string; right?: React.ReactNode; children?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, backgroundColor: "#121214", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.16)" }}>
      <ScreenTitle title={title} right={right} compact />
      {children}
    </View>
  );
}
