// Header block of a tab screen: our 26pt title with the round "+" and, on
// Wishes, the search field. It's the top block of the screen: flush with the
// top edge, rounded only at the bottom, on the block fill. It stays put; the
// blocks below scroll under it with a 4pt gap.

import { View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "../theme/tokens";
import { ScreenTitle } from "./ui";

export const BLOCK_R = 24;
export const BLOCK_GAP = 4;

/** `searching`: the title row folds away (like iOS while a search is active) and the field moves up. */
export function TabHeader({ title, right, children, searching }: { title: string; right?: React.ReactNode; children?: React.ReactNode; searching?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 4, backgroundColor: C.card, borderBottomLeftRadius: BLOCK_R, borderBottomRightRadius: BLOCK_R, zIndex: 2 }}
    >
      {!searching ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          <ScreenTitle title={title} right={right} compact />
        </Animated.View>
      ) : null}
      <Animated.View layout={LinearTransition.duration(220)}>{children}</Animated.View>
    </Animated.View>
  );
}

/** A content block: the block fill, rounded corners, 16 inside. */
export function Block({ children, grow, style }: { children: React.ReactNode; grow?: boolean; style?: object }) {
  return <View style={[{ backgroundColor: C.card, borderRadius: BLOCK_R, padding: 16 }, grow ? { flexGrow: 1 } : null, style]}>{children}</View>;
}
