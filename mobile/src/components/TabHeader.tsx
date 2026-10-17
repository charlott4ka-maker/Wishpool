// Header block of a tab screen: our 26pt title with the round "+" and, on
// Wishes, the search field. It's the top block of the screen: flush with the
// top edge, rounded only at the bottom, on the block fill. It stays put; the
// blocks below scroll under it with a 4pt gap.

import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "../theme/tokens";
import { ScreenTitle } from "./ui";

export const BLOCK_R = 24;
export const BLOCK_GAP = 4;

export function TabHeader({ title, right, children }: { title: string; right?: React.ReactNode; children?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 4, backgroundColor: C.card, borderBottomLeftRadius: BLOCK_R, borderBottomRightRadius: BLOCK_R, zIndex: 2 }}>
      <ScreenTitle title={title} right={right} compact />
      {children}
    </View>
  );
}

/** A content block: the block fill, rounded corners, 16 inside. */
export function Block({ children, grow, style }: { children: React.ReactNode; grow?: boolean; style?: object }) {
  return <View style={[{ backgroundColor: C.card, borderRadius: BLOCK_R, padding: 16 }, grow ? { flexGrow: 1 } : null, style]}>{children}</View>;
}
